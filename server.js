require("dotenv").config();
require("newrelic");

const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || "8080";
const { default: axios } = require("axios");
const mysqlConObj = require("./config/mysql");
const db = mysqlConObj.init();
var ytDurationFormat = require("youtube-duration-format");
var moment = require("moment");

var whitelist = [
  "https://yt-algorithm-breaker.netlify.app",
  "http://localhost:3000",
];
var corsOptions = {
  origin: whitelist,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const allQuery = `SELECT * FROM videos`;
const randQuery = `SELECT * FROM videos AS t1 JOIN 
(SELECT video_url FROM videos ORDER BY RAND() LIMIT 5) AS t2 ON t1.video_url=t2.video_url`;

/* video info */
app.get("/api/admin", (req, res) => {
  var videos = [];

  db.query(allQuery, async (err, data) => {
    if (err) console.log(err);
    else {
      for (let i = 0; i < data.length; ++i) {
        let res = await axios.get(
          `https://www.googleapis.com/youtube/v3/videos?part=id%2C+snippet&id=${data[i].video_url}&part=contentDetails&key=${process.env.YT_API_KEY}`
        );
        const sub = res.data.items[0].snippet;
        videos.push({
          id: i,
          url: `https://youtu.be/${data[i].video_url}`,
          thumbnail: `http://img.youtube.com/vi/${data[i].video_url}/0.jpg`,
          video_title: sub.title,
          channel_name: sub.channelTitle,
          publish_date: moment(sub.publishedAt).format("YYYY-MM-DD"),
          db_upload_date: moment(data[i].update_time).format("YYYY-MM-DD"),
        });
      }
      res.send(videos);
    }
  });
});

app.get("/api/video", (req, res) => {
  var videos = [];

  db.query(randQuery, async (err, data) => {
    if (err) console.log(err);
    else {
      for (let i = 0; i < data.length; ++i) {
        let res = await axios.get(
          `https://www.googleapis.com/youtube/v3/videos?part=id%2C+snippet&id=${data[i].video_url}&part=contentDetails&key=${process.env.YT_API_KEY}`
        );
        const sub = res.data.items[0].snippet;
        const dur = res.data.items[0].contentDetails.duration;
        videos.push({
          id: i,
          url: data[i].video_url,
          video_title: sub.title,
          channel_name: sub.channelTitle,
          playtime: ytDurationFormat(dur),
        });
      }
      res.send(videos);
    }
  });
});

/* login */
app.post("/user/login", (req, res) => {
  res.send({
    token: "test123",
  });
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}/api/video`);
});
