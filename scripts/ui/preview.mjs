const controls = document.getElementById('controls');
const frame = document.getElementById('preview');
const statusText = document.getElementById('build-status');
const errorText = document.getElementById('build-error');
let hash;

const initial = new URLSearchParams(location.search);
for (const select of controls.querySelectorAll('select')) {
  if (
    [...select.options].some(
      (option) => option.value === initial.get(select.name),
    )
  ) {
    select.value = initial.get(select.name);
  }
}

function refresh() {
  const params = new URLSearchParams(new FormData(controls));
  const [width, height] = params.get('viewport').split('x').map(Number);
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  history.replaceState(null, '', `/?${params}`);
  params.delete('viewport');
  const url = `/fixture?${params}`;
  frame.src = url;
  document.getElementById('standalone').href = url;
}
controls.addEventListener('change', refresh);
controls.addEventListener('submit', (event) => {
  event.preventDefault();
  refresh();
});

async function poll() {
  try {
    const response = await fetch('/status');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const status = await response.json();
    errorText.hidden = !status.error;
    errorText.textContent = status.error || '';
    statusText.textContent = status.error
      ? '빌드 실패 — 아래 오류를 확인하세요.'
      : status.building
        ? '소스 빌드 중…'
        : `최신 빌드 ${status.hash} · ${new Date(status.builtAt).toLocaleTimeString()}`;
    if (status.hash && status.hash !== hash) {
      hash = status.hash;
      refresh();
    }
  } catch (error) {
    statusText.textContent = `서버 연결 실패: ${error.message}`;
  } finally {
    setTimeout(poll, 1000);
  }
}
void poll();
