// Sensores Bluetooth ao vivo (Web Bluetooth): frequência cardíaca e balança.
// Usa só os serviços PADRÃO do Bluetooth SIG — funciona com cintas cardíacas (Polar, Garmin HRM,
// Wahoo, Coospo…) e com balanças que implementam o "Weight Scale Service". Marcas com protocolo
// próprio (várias balanças chinesas) não expõem esses serviços.
// Disponível no Chrome/Edge do Android e do computador. O Safari (iPhone) não suporta Web Bluetooth.

export const bluetoothSupport = () => {
  if (!('bluetooth' in navigator)) return { ok: false, why: /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'browser' };
  if (!window.isSecureContext) return { ok: false, why: 'https' };
  return { ok: true };
};

/** Frequência cardíaca (Heart Rate Service 0x180D, característica 0x2A37). */
export async function connectHeartRate(onBpm, onEnd) {
  const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
  device.addEventListener('gattserverdisconnected', () => onEnd?.());
  const server = await device.gatt.connect();
  const ch = await (await server.getPrimaryService('heart_rate')).getCharacteristic('heart_rate_measurement');
  ch.addEventListener('characteristicvaluechanged', (e) => {
    const v = e.target.value;
    const flags = v.getUint8(0);
    const bpm = flags & 0x01 ? v.getUint16(1, true) : v.getUint8(1); // bit 0: formato 16 bits
    if (bpm > 25 && bpm < 250) onBpm(bpm);
  });
  await ch.startNotifications();
  return { name: device.name || 'Sensor cardíaco', disconnect: () => device.gatt.connected && device.gatt.disconnect() };
}

/** Balança (Weight Scale Service 0x181D, característica Weight Measurement 0x2A9D). */
export async function connectScale(onWeight, onEnd) {
  const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['weight_scale'] }] });
  device.addEventListener('gattserverdisconnected', () => onEnd?.());
  const server = await device.gatt.connect();
  const ch = await (await server.getPrimaryService('weight_scale')).getCharacteristic('weight_measurement');
  ch.addEventListener('characteristicvaluechanged', (e) => {
    const v = e.target.value;
    const imperial = v.getUint8(0) & 0x01;         // bit 0: 0 = kg (resolução 0,005), 1 = lb (0,01)
    const raw = v.getUint16(1, true);
    const kg = imperial ? raw * 0.01 * 0.45359237 : raw * 0.005;
    if (kg > 20 && kg < 350) onWeight(Math.round(kg * 10) / 10);
  });
  await ch.startNotifications();
  return { name: device.name || 'Balança', disconnect: () => device.gatt.connected && device.gatt.disconnect() };
}

/** Mensagem amigável para erros do Web Bluetooth. */
export function bluetoothError(err) {
  if (err?.name === 'NotFoundError') return 'Nenhum aparelho selecionado (ou nenhum compatível por perto). Ligue o sensor e tente de novo.';
  if (err?.name === 'SecurityError') return 'O navegador bloqueou o Bluetooth. Use o Chrome e permita o acesso.';
  if (err?.name === 'NetworkError') return 'A conexão caiu. Aproxime o sensor e tente de novo.';
  if (/service|characteristic/i.test(err?.message || '')) return 'Esse aparelho não usa o padrão Bluetooth de saúde (protocolo próprio da marca). Lance o valor manualmente.';
  return err?.message || 'Falha no Bluetooth.';
}
