import asyncio
import websockets
# import logging
# import json
# import uvloop





# set global variables
connections = {}

async def ws_handler(websocket, path):
    # may set connections variables here

    # while True:
    message = await websocket.recv()
    print(message)


async def slow_operation():
    await asyncio.sleep(1)
    return 'Future is done!'


def got_result(future):
    print('aa', future.result())


loop = asyncio.get_event_loop()
ws_server = websockets.serve(ws_handler, host='0.0.0.0', port=8765, loop=loop)
# future = asyncio.ensure_future(ws_server)
future = asyncio.ensure_future(slow_operation())
future.add_done_callback(got_result)


loop.run_forever()
