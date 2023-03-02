import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const clientSMC = new SecretsManagerClient({
    region: 'eu-west-3',
});

export const getSecret = async (secretPath: string) => {
    const command = new GetSecretValueCommand({ SecretId: secretPath });
    const response = await clientSMC.send(command);
    return response.SecretString ? JSON.parse(response.SecretString) : undefined;
};