export function onRequestGet() {
  return new Response("MONTE SANO TEST FUNCTION LIVE", {
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
}
