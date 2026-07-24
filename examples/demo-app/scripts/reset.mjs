const response = await fetch("http://127.0.0.1:3100/api/reset", {
  method: "POST",
});

if (!response.ok) {
  console.error("Failed to reset demo state:", response.status);
  process.exitCode = 1;
} else {
  const payload = await response.json();
  console.log(JSON.stringify(payload, null, 2));
}
