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

const ytApi = "https://www.googleapis.com/youtube/v3/videos?part=id%2C+snippet";

/* video info */
app.get("/api/admin", (req, res) => {
  var videos = [];
  const allQuery = `SELECT * FROM videos`;

  db.query(allQuery, async (err, data) => {
    if (!err) {
      for (let i = 0; i < data.length; ++i) {
        let res = await axios.get(
          `${ytApi}&id=${data[i].video_url}&part=contentDetails&key=${process.env.YT_API_KEY}`
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
    } else console.log(err);
  });
});

app.get("/api/video", (req, res) => {
  var videos = [];
  const randQuery = `SELECT * FROM videos AS t1 
  JOIN (SELECT video_url FROM videos ORDER BY RAND() LIMIT 5) AS t2 
  ON t1.video_url = t2.video_url`;

  db.query(randQuery, async (err, data) => {
    if (!err) {
      for (let i = 0; i < data.length; ++i) {
        let res = await axios.get(
          `${ytApi}&id=${data[i].video_url}&part=contentDetails&key=${process.env.YT_API_KEY}`
        );
        const sub = res.data.items[0].snippet;
        const dur = res.data.items[0].contentDetails.duration;
        videos.push({
          id: i,
          url: data[i].video_url,
          video_title: sub.title,
          channel_name: sub.channelTitle,
          playtime: ytDurationFormat(dur),
          publish_date: moment(sub.publishedAt).format("YYYY-MM-DD"),
        });
      }
      res.send(videos);
    } else console.log(err);
  });
});

/* login */
app.post("/user/login", (req, res) => {
  const user_id = req.body.inputID;
  const user_pw = req.body.inputPW;
  const checkIdExists =
    `SELECT COUNT(*) AS result FROM users WHERE user_id = ?`;
  const checkAccount = `SELECT 
  CASE (SELECT COUNT(*) FROM users WHERE user_id = '${user_id}' AND user_pw = '${user_pw}')
      WHEN '0' THEN NULL
      ELSE (SELECT user_id FROM users WHERE user_id = '${user_id}' AND user_pw = '${user_pw}')
  END AS accID,
  CASE (SELECT COUNT(*) FROM users WHERE user_id = '${user_id}' AND user_pw = '${user_pw}')
      WHEN '0' THEN NULL
      ELSE (SELECT user_pw FROM users WHERE user_id = '${user_id}' AND user_pw = '${user_pw}')
  END AS accPW`;

  db.query(checkIdExists, user_id, (err, data) => {
    if (!err) {
      if (data[0].result == 1) {
        // 비밀번호 일치 확인
        db.query(checkAccount, (err, data) => {
          if (!err) {
            if (data[0].accID !== null && data[0].accPW !== null)
              res.send({ token: "OK" });
            else res.send({ msg: "아이디와 비밀번호를 다시 확인해주세요." });
          }
          else res.send(err);
        });
      } else {
        // 결과값이 1보다 작다면 해당 id가 존재하지 않는다는 뜻
        res.send({ msg: "존재하지 않는 아이디입니다." });
      }
    } else res.send(err);
  });
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}/api/video`);
});
