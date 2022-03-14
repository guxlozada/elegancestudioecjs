const locale = "es-EC",
  timezone = "America/Guayaquil",
  tzOffset = 5// horas de diferencia en zona horaria del ecuador

export function ahoraString() {
  const hoy = new Date()
  return hoy.toLocaleString(locale, { timeZone: "America/Guayaquil" });
}

export function ahoraTimestamp() {
  return Date.now()
}

export function hoyString() {
  const hoy = new Date()
  return hoy.toLocaleDateString(locale, { timeZone: timezone })
}

export function timestampInputDateToDateEc(vsDate) {
  return new Date(vsDate).addHours(tzOffset).getTime()
}

export function timestampLocalTimezoneString(vnTimestamp) {
  const d = new Date(vnTimestamp)
  return d.toLocaleString(locale, { timeZone: timezone });
}

export function dateLocalTimezoneString(vnTimestamp) {
  const d = new Date(vnTimestamp)
  return d.toLocaleDateString(locale, { timeZone: timezone })
}