# fn-thumb function

A thumbnail generator example using [FnProject](http://fnproject.io/) and [Minio's](http://docs.minio.io/docs/javascript-client-api-reference) javascript API. This is a simple example of how to build an AWS Lambda like function.

![](res/image003.png)

> Note: minio doesn't call webhook using mirroring
> ```$ mc mirror --overwrite --remove . myminio/images```

## Dependencies

### Customized fnproject/node image

The fn-thumb depends on npm module [sharp](https://www.npmjs.com/package/sharp).

The image provides by FnProject doesn't have all required dependencies for its installation. See: <https://github.com/lovell/sharp/issues/564>

You can build your own image cloning one of the official images from <https://github.com/fnproject/dockers>.

For this example the image was created from <https://github.com/asantos2000/fn-thumb/tree/master/node-py>:

**Dockerfile**

```dockerfile
# RUN echo '@edge http://nl.alpinelinux.org/alpine/edge/main' >> /etc/apk/repositories
# # RUN echo '@community http://nl.alpinelinux.org/alpine/edge/community' >> /etc/apk/repositories

# RUN apk update && apk upgrade \
#   && apk add git build-base nodejs-dev@edge nodejs@edge \
#   && npm install -g npm \
#   && rm -rf /var/cache/apk/*

RUN apk add vips-dev fftw-dev --update-cache --repository https://dl-3.alpinelinux.org/alpine/edge/testing/
RUN apk add vips-dev --update-cache --repository http://wjordan-apk.s3.amazonaws.com/ --allow-untrusted
RUN apk add python nodejs g++ make
```

And build/deployed with the ruby builder provided by [FnProject dockers node repository](https://github.com/fnproject/dockers/tree/master/node) or mine:

**build.rb**

```ruby
require 'open3'
require_relative '../utils/builder'

name = "adsantos/node-py"

tag = "latest"
build("#{name}:#{tag}")
v, status = Open3.capture2e("docker run --rm #{name}:#{tag} node -v")
v = v.strip
# returns: vX.Y.Z
puts v
v = v[1..v.length] # chop off v
puts v
new_tags = vtag(name, tag, v, false)

Dir.chdir 'dev'
tag = "dev"
build("#{name}:#{tag}")
new_tags += vtag(name, tag, v, true)

push_all(name, new_tags)
```
and build and deploy it with

```ruby build.rb```

You can create your own base image (changing name of the image for your docker hub repository) or use my ```adsantos/node-py```.

## Start

### RabbitMQ

Start RabbitMQ

```bash
$ docker run --rm -d --hostname my-rabbit -p 15672:15672 -p 5672:5672 --name rabbit-srv rabbitmq:3-management
```

#### Configuring queues <a id="rabbit-configuring-queues"></a>
Minio will not bind any queue to the **bucketevents** exchange, you need to do it yourself.

![bindings](res/image001.png)
 
After configure minio notification event (See: [Minio configuration](#minio-configuring)), it'll start to receive messages like that:
 
![bindings](res/image002.png)

```json
{
  "EventType": "s3:ObjectCreated:Put", 
  "Key": "images/ant2.jpg", 
  "Records": [
    {
      "awsRegion": "", 
      "eventName": "s3:ObjectCreated:Put", 
      "eventSource": "minio:s3", 
      "eventTime": "2018-03-02T18:05:38Z", 
      "eventVersion": "2.0", 
      "requestParameters": {
        "sourceIPAddress": "172.17.0.1:42002"
      }, 
      "responseElements": {
        "x-amz-request-id": "15182C9FA54DA147", 
        "x-minio-origin-endpoint": "http://127.0.0.1:9000"
      }, 
      "s3": {
        "bucket": {
          "arn": "arn:aws:s3:::images", 
          "name": "images", 
          "ownerIdentity": {
            "principalId": "4CU2YXB8M42FPXHF1C2D"
          }
        }, 
        "configurationId": "Config", 
        "object": {
          "contentType": "image/jpeg", 
          "eTag": "4c12dea0d6f201d2d5e3e0bc01b088db", 
          "key": "ant2.jpg", 
          "sequencer": "15182C9FA54DA147", 
          "size": 40830, 
          "userMetadata": {
            "X-Amz-Meta-Com.apple.quarantine": "0083;55a3aebb;Safari;", 
            "content-type": "image/jpeg"
          }, 
          "versionId": "1"
        }, 
        "s3SchemaVersion": "1.0"
      }, 
      "source": {
        "host": "172.17.0.1", 
        "port": "42002", 
        "userAgent": "Minio (darwin; amd64) minio-go/4.0.7 mc/2018-02-09T23:07:36Z"
      }, 
      "userIdentity": {
        "principalId": "4CU2YXB8M42FPXHF1C2D"
      }
    }
  ], 
  "level": "info", 
  "msg": "", 
  "time": "2018-03-02T18:05:38Z"
}
```

Save fill of then to use it as a request for fn-thumb function.

Access console at <http://localhost:15672>, user: guest, pwd: guest

### Minio

> Note: I don't know why minio server refuses to start if any error occurs trying to connect at webhook endpoint (fn function). The workaround is to start minio server before fn server.

> There is a similar problem with RabbitMQ, if minio server cannot obtain a connection with RabbitMQ (bad user, ip, port, whatever.)

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
				"endpoint": "http://fn-srv:8080/r/myapp/fn-thumb"
			}
		},
...		
```

#### Running
```bash
# Get your machine IP address
$ ifconfig
lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST> mtu 16384
	options=1203<RXCSUM,TXCSUM,TXSTATUS,SW_TIMESTAMP>
	inet 127.0.0.1 netmask 0xff000000
	inet6 ::1 prefixlen 128
	inet6 fe80::1%lo0 prefixlen 64 scopeid 0x1
	inet 127.94.0.1 netmask 0xff000000
	nd6 options=201<PERFORMNUD,DAD>
gif0: flags=8010<POINTOPOINT,MULTICAST> mtu 1280
stf0: flags=0<> mtu 1280
EHC250: flags=0<> mtu 0
EHC253: flags=0<> mtu 0
en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	options=10b<RXCSUM,TXCSUM,VLAN_HWTAGGING,AV>
	ether 70:cd:60:f2:5f:31
	nd6 options=201<PERFORMNUD,DAD>
	media: autoselect (none)
	status: inactive

# -----------	
en1: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	ether e0:f8:47:2e:2e:56
	inet6 fe80::1c51:d22a:ad82:43f7%en1 prefixlen 64 secured scopeid 0x7
	inet ***172.20.8.203*** netmask 0xfffff800 broadcast 172.20.15.255
	nd6 options=201<PERFORMNUD,DAD>
	media: autoselect
	status: active
# -----------	
	
p2p0: flags=8843<UP,BROADCAST,RUNNING,SIMPLEX,MULTICAST> mtu 2304
	ether 02:f8:47:2e:2e:56
	media: autoselect
	status: inactive
fw0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 4078
	lladdr c8:2a:14:ff:fe:7a:17:0c
	nd6 options=201<PERFORMNUD,DAD>
	media: autoselect <full-duplex>
	status: inactive
en2: flags=8963<UP,BROADCAST,SMART,RUNNING,PROMISC,SIMPLEX,MULTICAST> mtu 1500
	options=60<TSO4,TSO6>
	ether d2:00:17:a1:70:c0
	media: autoselect <full-duplex>
	status: inactive
bridge0: flags=8822<BROADCAST,SMART,SIMPLEX,MULTICAST> mtu 1500
	options=63<RXCSUM,TXCSUM,TSO4,TSO6>
	ether d2:00:17:a1:70:c0
	Configuration:
		id 0:0:0:0:0:0 priority 0 hellotime 0 fwddelay 0
		maxage 0 holdcnt 0 proto stp maxaddr 100 timeout 1200
		root id 0:0:0:0:0:0 priority 0 ifcost 0 port 0
		ipfilter disabled flags 0x2
	member: en2 flags=3<LEARNING,DISCOVER>
	        ifmaxaddr 0 port 10 priority 0 path cost 0
	media: <unknown type>
	status: inactive
utun0: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 2000
	inet6 fe80::3932:8f64:2235:6953%utun0 prefixlen 64 scopeid 0xc
	nd6 options=201<PERFORMNUD,DAD>

# Start minio-srv
$ docker run --rm -p 9000:9000 --name minio-srv \
--add-host=fn-srv:172.20.8.203 \
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

### FnProject (dev mode)

```bash
# start fn server
$ fn start
# Fn Dashboard
$ docker run --rm -it --link fnserver:api -p 4000:4000 -e "FN_API_URL=http://api:8080" fnproject/ui
```

## Building function

Clone the source from <https://github.com/asantos2000/fn-thumb>

### Configuring

Configure the ```config/default.json``` to access your minio server:

```json
{
  "config": {
    "endPoint": "172.20.8.203",
    "port": 9000,
    "secure": false,
    "accessKey": "4CU2YXB8M42FPXHF1C2D",
    "secretKey": "xb8XN9HbU92nrWRQc2loEP4XOBwd7UarNhf6LJlO",
    "bucket": "images",
    "destBucket": "images-processed",
    "prefix": "",
    "suffix": ".jpg",
    "events": [
      "s3:ObjectCreated:*"
    ]
  }
}
```

If you change the base image for this function, change it on the func.yaml file.

```yaml
name: adsantos/fn-thumb
version: 0.0.8
runtime: node
entrypoint: node func.js
build_image: adsantos/node-py
run_image: adsantos/node-py
type: async
```

### Deploying

```bash
# Deploy
$ fn deploy --app myapp

# List routes
$ fn routes list myapp

# List logs
$ fn calls list myapp

# Show log
# Todo: Not showing console.log
$ fn logs get myapp 01C7KYDB5187WJE00000000000

# Remove route
$ fn routes  delete myapp /fn-thumb
```

## Minio events configuration

> Before configuring the events, try few tests. See: [Testing everything](#testing-everything)

Configure the minio directories and events

```bash
# Directories
$ mc mb myminio/images
$ mc mb myminio/images-processed

# Events
$ mc events add myminio/images arn:minio:sqs::1:webhook --events put --suffix .jpg
$ mc events add myminio/images-processed arn:minio:sqs::1:amqp --suffix .jpg
```

## Testing everything <a id="testing-everything"></a>

First, you need a payload (request.json file), you can get it from RabbitMQ copying an image file to the minio directory image, it'll trigger a message to RabbitMQ. See: [Rabbit Configuring Queues](#rabbit-configuring-queues).

```bash
# Before configure webhook
$ mc cp images/ant.jpg myminio/images

# Grab a message from RabbitMQ and create a request.json with it
$ fn call myapp /fn-thumb < request.json

# There is two files images/ant.jpg and images-processed/ant-thumbnail.jpg as a result
$ mc ls myminio/images/
$ mc ls myminio/images-processed/
# Count files
$ mc ls --json --recursive myminio/images | wc -l
$ mc ls --json --recursive myminio/images-processed | wc -l

# After configure events
$ mc cp images/ant2.jpg myminio/images

# ant2.jpg and ant2-thumbnail.jpg
$ mc ls myminio/images/
$ mc ls myminio/images-processed/

# Bulk
$ mc cp images/*.jpg myminio/images
$ mc cp ~/Pictures/*.jpg myminio/images
```

## Cleaning up
You'll probably create lots of images, and copy a bunch of files, to clean up a little bit, try this:

```bash
# Minio
$ mc cp ~/Pictures/*.jpg myminio/images
$ mc rm -r --force myminio/images-processed
$ mc rm -r --force myminio/images

# Docker images
$ docker image prune
$ docker images
$ docker rmi <image_id> <image_id> <image_id>
```
