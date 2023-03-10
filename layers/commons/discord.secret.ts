import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const clientSMC = new SecretsManagerClient({
    region: 'eu-west-3',
});

function memoize(fn:Function): Function {
    let cache:any = {};
    return (...args:any[]) => {
        let n = args[0];  // just taking one argument here
        if (n in cache) {
            return cache[n];
        }
        else {
            let result = fn(n);
            cache[n] = result;
            return result;
        }
    }
}

const getSecretRequest = async (secretPath: string) => {
    const command = new GetSecretValueCommand({ SecretId: secretPath });
    const response = await clientSMC.send(command);
    return response.SecretString ? JSON.parse(response.SecretString) : undefined;
};

export const getSecret = memoize(getSecretRequest);