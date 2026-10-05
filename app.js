const samples = [
  { id: 'sample-1', name: 'Office_5G', download: 284, upload: 112, latency: 9, source: 'sample' },
  { id: 'sample-2', name: 'Cafe_Morning', download: 186, upload: 132, latency: 16, source: 'sample' },
  { id: 'sample-3', name: 'Public_WiFi_Free', download: 92, upload: 38, latency: 7, source: 'sample' },
  { id: 'sample-4', name: 'Studio_Guest', download: 48, upload: 21, latency: 45, source: 'sample' },
];
const storageKey = 'wave-wifi-results-v1';
const list = document.querySelector('#networkList');
const addDialog = document.querySelector('#addDialog');
const infoDialog = document.querySelector('#infoDialog');
const form = document.querySelector('#networkForm');
const tabs = [...document.querySelectorAll('.metric-tab')];
const labels = { download: '다운로드', upload: '업로드', latency: '지연시간' };
let activeMetric = 'download';
let selectedId = null;
let userNetworks = readSaved();

function readSaved() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(data) ? data.filter(validNetwork).slice(0, 50) : [];
  } catch { return []; }
}
function validNetwork(item) {
  return item && typeof item.name === 'string' && ['download', 'upload', 'latency'].every(key => Number.isFinite(item[key]) && item[key] > 0);
}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(userNetworks)); } catch {}
}
function format(value) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function node(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
}
function metricValue(network) { return network[activeMetric]; }
function metricUnit() { return activeMetric === 'latency' ? 'ms' : 'Mbps'; }
function rankNetworks(networks) {
  return networks.sort((a, b) => activeMetric === 'latency' ? a.latency - b.latency : b[activeMetric] - a[activeMetric]);
}
function render() {
  const ranked = rankNetworks([...samples, ...userNetworks]);
  const first = ranked[0];
  const second = ranked[1];
  const highest = Math.max(...ranked.map(metricValue));
  const lowest = Math.min(...ranked.map(metricValue));
  document.querySelector('#networkCount').textContent = `${ranked.length}개 네트워크`;
  document.querySelector('#countLabel').textContent = String(ranked.length);
  document.querySelector('#rankingMetricLabel').textContent = `${labels[activeMetric]} ${metricUnit()}`;
  document.querySelector('#leaderDifference').textContent = `${labels[activeMetric]} 1위 · ${first.name}${second ? ` · ${activeMetric === 'latency' ? `${format(second.latency - first.latency)} ms 낮음` : `${format(first[activeMetric] - second[activeMetric])} Mbps 빠름`}` : ''}`;
  tabs.forEach(tab => {
    const active = tab.dataset.metric === activeMetric;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-pressed', String(active));
  });
  list.replaceChildren();
  ranked.forEach((network, index) => {
    const row = node('article', `network-row ${index === 0 ? 'is-first' : ''} ${selectedId === network.id ? 'is-open' : ''}`);
    const button = node('button', 'network-main');
    button.type = 'button';
    button.setAttribute('aria-expanded', String(selectedId === network.id));
    button.setAttribute('aria-label', `${index + 1}위 ${network.name}, ${labels[activeMetric]} ${format(metricValue(network))} ${metricUnit()}, 상세 보기`);
    const rank = node('span', 'row-rank', String(index + 1).padStart(2, '0'));
    const identity = node('span', 'row-identity');
    identity.append(node('strong', '', network.name), node('small', '', network.source === 'sample' || network.tag === '샘플' ? '샘플 기록' : '내 기록'));
    const graph = node('span', 'row-graph');
    const track = node('span', 'graph-track');
    const bar = node('span', 'graph-bar');
    const fraction = activeMetric === 'latency' ? lowest / network.latency : network[activeMetric] / highest;
    bar.style.transform = `scaleX(${Math.max(0.06, Math.min(1, fraction))})`;
    track.append(bar);
    graph.append(track);
    const score = node('span', 'row-score');
    score.append(node('strong', '', format(metricValue(network))), node('small', '', metricUnit()));
    const chevron = node('span', 'row-chevron', '⌄');
    chevron.setAttribute('aria-hidden', 'true');
    button.append(rank, identity, graph, score, chevron);
    button.addEventListener('click', () => { selectedId = selectedId === network.id ? null : network.id; render(); });
    row.append(button);
    if (selectedId === network.id) {
      const details = node('div', 'network-details');
      const specs = [
        ['다운로드', `${format(network.download)} Mbps`],
        ['업로드', `${format(network.upload)} Mbps`],
        ['지연시간', `${format(network.latency)} ms`],
      ];
      specs.forEach(([label, value]) => {
        const spec = node('div', 'detail-spec');
        spec.append(node('span', '', label), node('strong', '', value));
        details.append(spec);
      });
      if (network.source !== 'sample' && network.tag !== '샘플') {
        const remove = node('button', 'remove-button', '기록 삭제');
        remove.type = 'button';
        remove.addEventListener('click', () => {
          userNetworks = userNetworks.filter(item => item.id !== network.id);
          selectedId = null;
          save(); render();
        });
        details.append(remove);
      }
      row.append(details);
    }
    list.append(row);
  });
}

tabs.forEach(tab => tab.addEventListener('click', () => { activeMetric = tab.dataset.metric; selectedId = null; render(); }));
document.querySelector('#addButton').addEventListener('click', () => { form.reset(); document.querySelector('#formError').textContent = ''; addDialog.showModal(); });
document.querySelector('#closeDialog').addEventListener('click', () => addDialog.close());
document.querySelector('#infoButton').addEventListener('click', () => infoDialog.showModal());
document.querySelector('#closeInfo').addEventListener('click', () => infoDialog.close());
document.querySelector('#closeInfoBottom').addEventListener('click', () => infoDialog.close());
[addDialog, infoDialog].forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const download = Number(data.get('download'));
  const upload = Number(data.get('upload'));
  const latency = Number(data.get('latency'));
  if (!name || [download, upload, latency].some(value => !Number.isFinite(value) || value <= 0 || value > 10000)) {
    document.querySelector('#formError').textContent = '이름과 올바른 측정값을 입력해주세요.';
    return;
  }
  const network = { id: `user-${Date.now()}`, name, download, upload, latency, source: 'user' };
  userNetworks.unshift(network);
  userNetworks = userNetworks.slice(0, 50);
  selectedId = network.id;
  save(); render(); addDialog.close();
});
render();
