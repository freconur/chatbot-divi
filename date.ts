export const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"]

export const monthNumber = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
export const datesNumber = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31"]
export const currentYear = () => {
  const date = new Date()
  return `${date.getFullYear()}`
}
export const currentMonth = () => {
  const date = new Date()
  return months[date.getMonth()]
}
export const currentMonthNumber = () => {
  const date = new Date()
  return date.getMonth()
}
export const currentDate = () => {
  const date = new Date()
  return `${date.getDate()}`
}