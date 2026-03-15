import { makeApiRequest } from '../MakeApiRequest/MakeApiRequest.ts'
import { makeStreamingApiRequest } from '../MakeStreamingApiRequest/MakeStreamingApiRequest.ts'

export const networkCommandMap = {
  'ChatNetwork.makeApiRequest': makeApiRequest,
  'ChatNetwork.makeStreamingApiRequest': makeStreamingApiRequest,
}
