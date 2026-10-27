export function pad(value, length) {
  let result = String(value);
  while (result.length < length) {
    result = `0${result}`;
  }
  return result;
}

export function hex2bin(hex) {
  const value = Number.parseInt(hex, 16) & 0xff;
  return pad(value.toString(2), 8);
}

export function bin2hex(bin) {
  const value = Number.parseInt(bin, 2) & 0xff;
  return pad(value.toString(16), 2);
}

export function bin2dec(bin) {
  let value = Number.parseInt(bin, 2) & 0xff;
  if (value >= 128) {
    value -= 256;
  }
  return value;
}

export function dec2bin(decimal) {
  return pad((decimal & 0xff).toString(2), 8);
}

export function hex2dec(hex) {
  let value = Number.parseInt(hex, 16) & 0xff;
  if (value >= 128) {
    value -= 256;
  }
  return value;
}

export function dec2hex(decimal) {
  return pad((decimal & 0xff).toString(16), 2);
}