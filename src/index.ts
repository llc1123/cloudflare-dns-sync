/* eslint-disable no-console */
import { resolve4, setServers } from 'dns'

import { request } from 'undici'

setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1'])

const token = process.env.CLOUDFLARE_TOKEN ?? ''
const zoneId = process.env.CLOUDFLARE_ZONE_ID ?? ''
const recordId = process.env.CLOUDFLARE_RECORD_ID ?? ''
const target = process.env.DNS_SYNC_TARGET ?? ''

const cloudflareGet = async <T = unknown>(path: string): Promise<T> => {
  const res = await request('https://api.cloudflare.com/client/v4/' + path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return await res.body.json()
}

const cloudflarePatch = async <T = unknown>(
  path: string,
  data: Record<string, unknown>,
): Promise<T> => {
  const res = await request('https://api.cloudflare.com/client/v4/' + path, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  return await res.body.json()
}

const lookupPromise = (target: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    resolve4(target, (_, addresses) => {
      if (addresses.length === 0) {
        reject(new Error('No addresses found'))
      }
      resolve(addresses[0])
    })
  })
}

const update = async () => {
  try {
    const prevPromise = cloudflareGet<{ result: { content: string } }>(
      `zones/${zoneId}/dns_records/${recordId}`,
    ).then((res) => res.result.content)
    const currPromise = lookupPromise(target)
    const [prevIp, currIp] = await Promise.all([prevPromise, currPromise])

    if (prevIp === currIp) {
      console.log('No update needed: ', currIp)
    } else {
      console.log('Updating: ', prevIp, ' -> ', currIp)
      await cloudflarePatch<{ result: { id: string } }>(
        `zones/${zoneId}/dns_records/${recordId}`,
        { content: currIp },
      )
    }
  } catch (e) {
    console.error(e)
  }
}

const updateLoop = () => {
  update()
  setTimeout(updateLoop, 1000 * 60 * 5)
}

updateLoop()
