import asyncio
import websockets
import logging
import json
import uvloop

asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

logging.basicConfig(level=logging.INFO)
logging.info('server starts')

connections = {}


async def RTCServer(websocket, path):
    async def channelClose():
        if message.get('uid') in connections[path].keys():
            del connections[path][message['uid']]
            for key, ws in connections[path].items():
                await ws.send(json.dumps({
                    'type': 'channelClose',
                    'uid': message['uid'],
                }))
            if len(connections[path]) == 0:
                del connections[path]

    async def getConnection(uid):
        return connections[path].get(uid, None)

    async def sendData(uid, data):
        connection = await getConnection(uid)

        if connection:
            return await connection.send(data)

    message = None
    if not connections.get(path):
        connections[path] = {}
    while True:
        try:
            message = await websocket.recv()
        except websockets.exceptions.ConnectionClosed:
            await channelClose()
            print('ConnectionClosed')
            return
        message = json.loads(message)
        # logging.info('got message {}'.format(message))
        logging.info('got message type: {}'.format(message['type']))

        if message['type'] == 'enterRoom':
            for key, ws in connections[path].items():
                await ws.send(json.dumps({
                    'type': 'newUser',
                    'uid': message.get('uid'),
                }))

            connections[path][message.get('uid')] = websocket

        elif message['type'] == 'offer':
            await sendData(message.get('toUid'), json.dumps({
                'type': 'offerFrom',
                'fromUid': message.get('fromUid'),
                'offer': message.get('offer'),
            }))

        elif message['type'] == 'answer':
            await sendData(message.get('toUid'), json.dumps({
                'type': 'answerFrom',
                'fromUid': message.get('fromUid'),
                'answer': message.get('answer'),
            }))

        elif message['type'] == 'iceCandidate':
            await sendData(message.get('toUid'), json.dumps({
                'type': 'iceCandidateFrom',
                'fromUid': message.get('fromUid'),
                'iceCandidate': message.get('iceCandidate'),
            }))

        elif message['type'] == 'channelClose':
            await channelClose()

start_server = websockets.serve(RTCServer, '0.0.0.0', 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
