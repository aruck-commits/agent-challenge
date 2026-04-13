export async function requireWallet(request: Request) {
  const wallet = request.headers.get('x-wallet-address');

  if (!wallet) {
    throw new Response('Wallet address required', { status: 401 });
  }

  return wallet;
}