const DISCORD_EPOCH = 1420070400000n;
const SNOWFLAKE_STR_LEN = 19; // max length of a Discord snowflake

export function discordSnowflakeToDate(snowflake: string): Date {
    const bigIntSnowflake = BigInt(snowflake);
    const timestamp = (bigIntSnowflake >> 22n) + DISCORD_EPOCH;
    return new Date(Number(timestamp));
}

export function dateToDiscordSnowflake(date: Date): string {
    const timestamp = BigInt(date.getTime()) - DISCORD_EPOCH;
    const snowflake = (timestamp << 22n).toString();
    return snowflake.padStart(SNOWFLAKE_STR_LEN, "0");
}
