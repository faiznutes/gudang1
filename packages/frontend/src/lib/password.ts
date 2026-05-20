const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'

export function generateTemporaryPassword(length = 16) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let password = ''
  for (let index = 0; index < length; index += 1) {
    password += PASSWORD_CHARS[bytes[index] % PASSWORD_CHARS.length]
  }
  return password
}
