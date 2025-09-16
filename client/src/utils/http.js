export async function parseResponse(response) {
  if (!response.ok) {
    const message = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(message.message || 'Request failed');
  }
  return response.json();
}
