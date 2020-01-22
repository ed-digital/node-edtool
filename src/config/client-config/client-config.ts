import toolUserConfig, { AuthedUser } from '../tool-user-config/tool-user-config'
import ConfigHandler from '../config-handler'
import { resolve } from 'path'
import {format} from 'date-fns'
import toolConfig from '../tool-config/tool-config'

function creditDateFormat (date = new Date()) {
  return format(date, 'MM/y')
}

interface ClientConfig {
  project: {
    name: string
    createdOn: string
    createdBy: AuthedUser | false

    /* When the person does the completed command */
    completedOn: string | false
    completedBy: AuthedUser | false

    /* Creator credits */
    credits: {
      [name: string]: {
        person: AuthedUser
        firstWorkedOn: string
        lastWorkedOn: string
      }
    }
  }
  tool: {
    /* Tool version number */
    version: string

    commands: {
      name: string
      version: string
    }
  }
}

const INITIAL_USER_CONFIG:ClientConfig = {
  project: {
    name: '',
    createdOn: creditDateFormat(),
    createdBy: toolUserConfig().authed,

    /* When the person does the completed command */
    completedOn: false,
    completedBy: false,

    /* Creator credits */
    credits: {
      
    }
  }
  tool: {
    /* Tool version number */
    version: toolConfig().tool.version

    commands: toolConfig().tool.commands
  }
}

if (toolUserConfig().authed) {
  // @ts-ignore
  INITIAL_USER_CONFIG.project.credits[toolUserConfig().authed.name] = {
    person: toolUserConfig().authed as AuthedUser,
    firstWorkedOn: creditDateFormat(),
    lastWorkedOn: creditDateFormat()
  }
}

let config:ClientConfig
export default () => {
  if (config) return config
  config = ConfigHandler.from(
    resolve(process.cwd(), './development-tool/user/config'),
    INITIAL_USER_CONFIG
  )
  return config
}
