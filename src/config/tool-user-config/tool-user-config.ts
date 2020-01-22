import ConfigHandler from '../config-handler'
import { homedir } from 'os'
import { resolve } from 'path'

export interface AuthedUser {
  id: string
  name: string
  picture: string
  secrets: {
    [key: string]: string
  }
  /* Date time */
  expiry: number
}

export interface UserConfig {
  authed: AuthedUser | false
}

const INITIAL_USER_CONFIG: UserConfig = {
  authed: false,
}

let config: UserConfig
const toolUserConfig = () => {
  if (config) return config
  config = ConfigHandler.from(
    resolve(homedir(), './development-tool/user/config'),
    INITIAL_USER_CONFIG
  )
  return config
}
export default toolUserConfig
