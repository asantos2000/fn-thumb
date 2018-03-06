docker run --rm -p 9000:9000 --name minio-srv \
--add-host=fn-srv:172.20.8.203 \
--link rabbit-srv \
-v $PWD/srv/data:/data \
-v $PWD/srv/config:/root/.minio \
minio/minio server /data

