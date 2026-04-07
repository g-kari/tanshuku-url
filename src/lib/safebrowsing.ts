const THREAT_TYPES = [
  'MALWARE',
  'SOCIAL_ENGINEERING',
  'UNWANTED_SOFTWARE',
  'POTENTIALLY_HARMFUL_APPLICATION',
];

export async function checkUrlSafety(
  url: string,
  apiKey: string | undefined
): Promise<boolean> {
  if (!apiKey) return true;

  try {
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'tanshuku-url', clientVersion: '1.0.0' },
          threatInfo: {
            threatTypes: THREAT_TYPES,
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }],
          },
        }),
      }
    );

    const data = (await response.json()) as { matches?: unknown[] };
    return !data.matches || data.matches.length === 0;
  } catch {
    // APIエラー時は安全として扱う
    return true;
  }
}
