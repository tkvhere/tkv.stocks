import os
from rq import Worker, Queue
from redis import Redis

listen = ['default']
redis_url = os.environ.get('REDIS_URL')
conn = Redis.from_url(redis_url)

if __name__ == '__main__':
    queues = [Queue(name, connection=conn) for name in listen]
    worker = Worker(queues, connection=conn)
    worker.work()
