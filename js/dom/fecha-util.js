const locale = "es-EC",
  timezoneEC = "America/Guayaquil",
  tzOffset = 5// horas de diferencia en zona horaria del ecuador

Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + (h * 60 * 60 * 1000));
  return this;
}

export function nowEcToString() {
  return nowEc().toLocaleString(locale, { timeZone: timezoneEC });
}

export function nowEc() {
  var nowEC = new Date().toLocaleString("en-US", { timeZone: timezoneEC })
  return new Date(nowEC);
}

export function timestampEc() {
  return nowEc().getTime()
}

export function todayEcToString() {
  return todayEc().toLocaleDateString(locale, { timeZone: timezoneEC })
}

export function todayEc() {
  var todayEC = new Date().toLocaleDateString("en-US", { timeZone: timezoneEC })
  return new Date(todayEC);
}

//TODO: Verificar uso y eliminar
export function timestampInputDateToDateEc(vsDate) {
  return new Date(vsDate).addHours(tzOffset).getTime()
}

//TODO: Verificar uso y eliminar
export function timestampLocalTimezoneString(vnTimestamp) {
  const d = new Date(vnTimestamp)
  return d.toLocaleString(locale, { timeZone: timezoneEC });
}

//TODO: Verificar uso y eliminar
export function dateLocalTimezoneString(vnTimestamp) {
  const d = new Date(vnTimestamp)
  return d.toLocaleDateString(locale, { timeZone: timezoneEC })
}