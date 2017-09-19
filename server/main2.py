import asyncio
import websockets
import logging
import json
# import uvloop


# set global variables
connections = {}


class WS_Handler:
    def __init__(self):
        self.connections = {}
        self.path = '/'

    async def __call__(self, websocket, path):
        # may set connections variables here
        self.path = path

        if not self.connections.get(path):
            self.connections[path] = {}

        try:
            while True:
                message = await websocket.recv()

                try:
                    data = json.loads(message)
                except:
                    break

                await self.dispatch_ws_types(data)(websocket, data)
                break

        except websockets.exceptions.ConnectionClosed:
            print('closed 1001')

    def dispatch_ws_types(self, data):
        ws_types_handles_map = {
            'enterRoom': self._on_enter_room,
        }

        return ws_types_handles_map.get(data.get('type'))

    async def _on_enter_room(self, websocket, data):
        print(data)
        print(self.connections)
        for key, ws in self.connections[self.path].items():
            if ws.open:
                await ws.send(json.dumps({
                    'type': 'newUser',
                    'uid': data.get('uid'),
                }))

        print()
        self.connections[self.path][data.get('uid')] = websocket
        print(self.connections)


loop = asyncio.get_event_loop()

ws_handler = WS_Handler()

ws_server = websockets.serve(ws_handler, host='0.0.0.0', port=8765, loop=loop)
future = asyncio.ensure_future(ws_server)

loop.run_forever()
