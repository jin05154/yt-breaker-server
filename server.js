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

async function getVideoInfo(url, key) {
  return axios.get(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${url}&part=contentDetails,statistics&key=${key}`
  );
}
async function getChannelInfo(id, key) {
  return axios.get(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${id}&part=contentDetails&key=${key}`
  );
}

/* video info */
app.get("/api/admin", (req, res) => {
  var videos = [];
  const allQuery = `SELECT * FROM videos`;

  db.query(allQuery, async (err, data) => {
    if (!err) {
      for (let i = 0; i < data.length; ++i) {
        let res = await getVideoInfo(data[i].video_url, process.env.YT_API_KEY);
        const sub = res.data.items[0].snippet;
        videos.push({
          id: i,
          url: `https://youtu.be/${data[i].video_url}`,
          thumbnail: `http://img.youtube.com/vi/${data[i].video_url}/default.jpg`,
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
        let video = await getVideoInfo(data[i].video_url, process.env.YT_API_KEY);
        const sub = video.data.items[0].snippet;
        const dur = video.data.items[0].contentDetails.duration;
        let channel = await getChannelInfo(sub.channelId, process.env.YT_API_KEY);
        videos.push({
          id: i,
          url: data[i].video_url,
          video_title: sub.title,
          channel_name: sub.channelTitle,
          channel_art: channel.data.items[0].snippet.thumbnails.default.url,
          playtime: ytDurationFormat(dur),
          view_count: shortenCount(video.data.items[0].statistics.viewCount),
          publish_date: moment(sub.publishedAt).format("YYYY-MM-DD"),
        });
      }
      res.send(videos);
    } else console.log(err);
  });
});

function shortenCount(view_count) {
  let nums = view_count;
  // 1천회~9.9천회
  if (view_count >= 1000 && view_count < 10000) {
    nums = view_count.slice(0, 2);
    if (nums[1] == 0) return `${nums[0]}천`;
    else return `${nums[0]}.${nums[1]}천`;
  }
  // 1만회~9.9만회
  else if (view_count >= 10000 && view_count < 100000) {
    nums = view_count.slice(0, 2);
    if (nums[1] == 0) return `${nums[0]}만`;
    else return `${nums[0]}.${nums[1]}만`;
  }
  // 10만회~99만회
  else if (view_count >= 100000 && view_count < 1000000) {
    nums = view_count.slice(0, 2);
    return `${nums[0]}${nums[1]}만`;
  }
  // 100만회~999만회
  else if (view_count >= 1000000 && view_count < 10000000) {
    nums = view_count.slice(0, 3);
    return `${nums[0]}${nums[1]}${nums[2]}만`;
  }
  // 1000만회~9999만회
  else if (view_count >= 10000000 && view_count < 100000000) {
    nums = view_count.slice(0, 4);
    return `${nums[0]}${nums[1]}${nums[2]}${nums[3]}만`;
  }
  // 1억회~9.9억회
  else if (view_count >= 100000000 && view_count < 1000000000) {
    nums = view_count.slice(0, 2);
    if (nums[1] == 0) return `${nums[0]}억`;
    else return `${nums[0]}.${nums[1]}억`;
  }
}

/* login */
app.post("/user/login", (req, res) => {
  const user_id = req.body.inputID;
  const user_pw = req.body.inputPW;
  const checkIdExists = `SELECT COUNT(*) AS result FROM users WHERE user_id = ?`;
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
          } else res.send(err);
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
