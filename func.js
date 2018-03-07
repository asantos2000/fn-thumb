/*
 * Thumbnail generator using Bucket Event Notification
 * (C) 2017 Minio, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Minio = require('minio');
var sharp = require('sharp');
var uuidV4 = require('uuid/v4');
var config = require('config');
var fs = require("fs");

//TODO: use consul to get config and DNS for minio server
var mcConfig = config.get('config');
if (mcConfig.endPoint === '<endpoint>') {
    console.log('Please configure your endpoint in \"config/webhook.json\".');
    process.exit(1);
}

console.log(mcConfig);

var mc = new Minio.Client(mcConfig);

// Allocate resize transformer from sharp().
// resize to 40 pixels wide and 40 pixes in height,
var transformer = sharp().resize(100, 100);

// Sharp defaults to jpeg, to use other formats use
// sharp() documentation at http://sharp.dimens.io/en/stable/

const imageType = 'image/jpg';

//var cache = [];
// var event_json = JSON.stringify(fs.readFileSync('/dev/stdin').toString(), function(key, value) {
//     if (typeof value === 'object' && value !== null) {
//         if (cache.indexOf(value) !== -1) {
//             // Circular reference found, discard key
//             return;
//         }
//         // Store value in our collection
//         cache.push(value);
//     }
//     return value;
// });
//cache = null; // Enable garbage collection

var event = JSON.parse(fs.readFileSync('/dev/stdin').toString());
console.log(event);

var eventType = event.EventType;
var bname = event.Records[0].s3.bucket.name;
var oname = event.Records[0].s3.object.key;

console.log("Request thumnbnail for:");
console.log("- EventType:", eventType);
console.log("- Bucket name:", bname);
console.log("- File name:", oname);

console.time("fn took");
mc.getObject(bname, oname,
    function (err, dataStream) {
        if (err) {
            return console.log(err);
        }
        var thumbnailName = oname.split('.')[0] + "-thumbnail.jpg";
        console.log("Uploading new thumbail to",
            "\"" + mcConfig.destBucket + "\"");
        mc.putObject(mcConfig.destBucket,
            thumbnailName,
            dataStream.pipe(transformer),
            imageType, function (err, etag) {
                if (err) {
                    return console.log(err);
                }
                console.log("Successfully uploaded",
                    "\"" + thumbnailName + "\"",
                    "with md5sum \"" + etag + "\"");
            });
    }
);
console.timeEnd("fn took");