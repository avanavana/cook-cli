let cachedStdinRead: Promise<string> | undefined;

export function hasPipedStdin(): boolean {
  return !process.stdin.isTTY;
}

export async function readProcessStdin(): Promise<string> {
  cachedStdinRead ??= new Promise<string>((resolve, reject) => {
    let source = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      source += chunk;
    });
    process.stdin.on('end', () => {
      resolve(source);
    });
    process.stdin.on('error', reject);
  });

  return cachedStdinRead;
}
