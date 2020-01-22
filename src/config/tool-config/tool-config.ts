import ConfigHandler from '../config-handler'
import { resolve } from 'path'

interface ToolCommand {
  name: string
  version: string
}

interface ToolConfig {
  tool: {
    name: string
    version: string
    supports: string
  }
  commands: ToolCommand[]
}

const INITIAL_TOOL_CONFIG: ToolConfig = {
  tool: {
    /* Bin name */
    name: 'ed',
    /* Current version */
    version: '0.0.0',
    /* Lowest level the tool supports (supposing semver) */
    supports: '0.0.0',
  },
  commands: [],
}

let config: ToolConfig
export default () => {
  if (config) return config
  config = ConfigHandler.from(
    resolve(__dirname, '../../../tool.config.json'),
    INITIAL_TOOL_CONFIG
  )
  return config
}
