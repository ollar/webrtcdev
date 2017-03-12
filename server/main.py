import asyncio
import websockets
import logging
import json

logging.basicConfig(level=logging.INFO)
logging.info('server starts')

connections = {}


async def RTCServer(websocket, path):
    if not connections.get(path):
        connections[path] = {}
    while True:
        message = await websocket.recv()
        message = json.loads(message)
        logging.info('got message {}'.format(message))

        if message['type'] == 'enterRoom':
            for key, ws in connections[path].items():
                await ws.send(json.dumps({
                        'type': 'newUser',
                        'uid': message.get('uid'),
                    }))

            connections[path][message.get('uid')] = websocket

        elif message['type'] == 'offer':
            await connections[path][message.get('toUid')]\
                .send(json.dumps({
                    'type': 'offerFrom',
                    'fromUid': message.get('fromUid'),
                    'offer': message.get('offer'),
                }))

        elif message['type'] == 'answer':
            await connections[path][message.get('toUid')]\
                .send(json.dumps({
                    'type': 'answerFrom',
                    'fromUid': message.get('fromUid'),
                    'answer': message.get('answer'),
                }))

        elif message['type'] == 'iceCandidate':
            await connections[path][message.get('toUid')]\
                .send(json.dumps({
                    'type': 'iceCandidateFrom',
                    'fromUid': message.get('fromUid'),
                    'iceCandidate': message.get('iceCandidate'),
                }))

        elif message['type'] == 'channelClose':
            if connections[path][message.get('uid')]:
                await connections[path][message['uid']].close()
                del connections[path][message['uid']]

start_server = websockets.serve(RTCServer, 'localhost', 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
