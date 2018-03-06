# Mirror with Minio client
**Ref:** <https://github.com/minio/mc>

Give folder with few images

```bash
images$ ls -l
total 28448
-rw-r--r--@ 1 anderson  staff     32586 Jul 13  2015 ant.jpg
-rw-r--r--@ 1 anderson  staff     40830 Jul 13  2015 ant2.jpg
-rw-r--r--@ 1 anderson  staff     50390 Jul  8  2015 antena.jpg
-rw-r--r--@ 1 anderson  staff    264623 Jul  8  2015 antena_26102012.jpg
-rw-r--r--@ 1 anderson  staff   1222548 Mar  5 10:00 fox.jpg
-rw-r--r--@ 1 anderson  staff  11699517 Aug 25  2017 pexels-photo.jpg
-rw-r--r--@ 1 anderson  staff   1245094 Feb 28 14:14 simple-background.jpg
```

## Start RabbitMQ
```bash
$ docker run --rm -d --hostname my-rabbit -p 15672:15672 -p 5672:5672 --name rabbit-srv rabbitmq:3-management
```


## Start Minio

> Note: For I don't know reason, minio server refuse to start if an error occours trying to connect with amqp endpoint (RabbitMQ: bad user, ip, port, whatever).

#### Configuring <a name="minio-configuring"></a>
Configure ```srv/config/config.json``` enabling webhook (fn route) and amqp (RabbitMQ) events:

```json
...
	"notify": {
		"amqp": {
			"1": {
				"enable": true,
				"url": "amqp://guest:guest@rabbit-srv:5672",
				"exchange": "bucketevents",
				"routingKey": "bucketlogs",
				"exchangeType": "fanout",
				"deliveryMode": 0,
				"mandatory": false,
				"immediate": false,
				"durable": false,
				"internal": false,
				"noWait": false,
				"autoDeleted": false
			}
		},
...
		"webhook": {
			"1": {
				"enable": true,
				"endpoint": "http://thumb-srv:8080/r/myapp/fn-thumb"
			}
		},
...		
```

#### Running
```bash
# Get your machine IP address
$ ifconfig
# -----------	
en1: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	ether e0:f8:47:2e:2e:56
	inet6 fe80::1c51:d22a:ad82:43f7%en1 prefixlen 64 secured scopeid 0x7
	inet ***172.20.8.203*** netmask 0xfffff800 broadcast 172.20.15.255
	nd6 options=201<PERFORMNUD,DAD>
	media: autoselect
	status: active
# -----------	

# Start minio-srv
docker run --rm -p 9000:9000 --name minio-srv \
--link rabbit-srv \
-v $PWD/srv/data:/data \
-v $PWD/srv/config:/root/.minio \
minio/minio server /data

Drive Capacity: 201 GiB Free, 455 GiB Total

Endpoint:  http://172.17.0.3:9000  http://127.0.0.1:9000
AccessKey: 4CU2YXB8M42FPXHF1C2D
SecretKey: xb8XN9HbU92nrWRQc2loEP4XOBwd7UarNhf6LJlO
SQS ARNs:  arn:minio:sqs::1:amqp arn:minio:sqs::1:webhook

Browser Access:
   http://172.17.0.3:9000  http://127.0.0.1:9000

Command-line Access: https://docs.minio.io/docs/minio-client-quickstart-guide
   $ mc config host add myminio http://172.17.0.3:9000 4CU2YXB8M42FPXHF1C2D xb8XN9HbU92nrWRQc2loEP4XOBwd7UarNhf6LJlO

Object API (Amazon S3 compatible):
   Go:         https://docs.minio.io/docs/golang-client-quickstart-guide
   Java:       https://docs.minio.io/docs/java-client-quickstart-guide
   Python:     https://docs.minio.io/docs/python-client-quickstart-guide
   JavaScript: https://docs.minio.io/docs/javascript-client-quickstart-guide
   .NET:       https://docs.minio.io/docs/dotnet-client-quickstart-guide
```

Console at <http://localhost:9000/>.


## Add event
```bash
$ mc events add myminio/temp arn:minio:sqs::1:amqp --suffix .jpg
```

## Run 1st test

This will create the exchange on RabbitMQ

```bash
$ mc cp ant.jpg myminio/temp
```

## Configuring queues <a id="rabbit-configuring-queues"></a>
Minio will not bind any queue to the **bucketevents** exchange, you need to do it yourself.

![bindings](res/image005.png)

## Run 2st test

Now you'll receive messages on queue.

```bash
$ mc cp ant.jpg myminio/temp
```

## Check RabbitMQ messages
After configure minio notification event (See: [Minio configuration](#minio-configuring)), it'll start to receive messages like that:
 
![bindings](res/image006.png)


## Start mirroring

```
$ mc mirror --watch --overwrite --remove . myminio/temp
...mages/simple-background.jpg:  31.30 MB / 31.30 MB  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  132.31 KB/s
```

## See messagings on RabbitMQ
![bindings](res/image007.png)

## Delete an image

```bash
$ mc rm Curitiba_Trinario_e_densidade_77_02_2006.jpg
```

```bash
$ mc mirror --watch --overwrite --remove . myminio/temp
...mages/simple-background.jpg:  31.30 MB / 31.30 MB  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  132.31 KB/s

Removing `myminio/temp/Curitiba_Trinario_e_densidade_77_02_2006.jpg`.
```

![bindings](res/image004.png)

> Note: if you copy files to the folder monitored by ```mc mirror``` using OS command (ie. ```cp```), it'll automatic sync with the remote folder, but it is not true if you delete it (ie. ```rm```), you must use ```mc rm``` command to keep it in sync. The guide suggest to you aliases those OS commands.