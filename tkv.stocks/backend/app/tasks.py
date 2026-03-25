from rq import Queue
from redis import Redis
import os
from .fetch_prices import fetch_and_store_symbol

redis_conn = Redis.from_url(os.environ.get('REDIS_URL'))
q = Queue(connection=redis_conn)

def enqueue_fetch(symbol):
    job = q.enqueue(fetch_and_store_symbol, symbol)
    return job.get_id()
