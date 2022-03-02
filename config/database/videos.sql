CREATE TABLE videos (
    video_url VARCHAR(30) NOT NULL PRIMARY KEY,
    first_category VARCHAR(30) NOT NULL,
    second_category VARCHAR(30),
    age VARCHAR(10),
    sex VARCHAR(10),
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);