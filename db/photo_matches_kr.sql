-- 밈 사진 자동 매칭 (네이버 이미지 검색). Supabase SQL Editor에 붙여넣기.
update memes set photo_url = 'https://img.theqoo.net/img/YyhoD.jpg' where id = 17 and coalesce(photo_url,'') = '';
update memes set photo_url = 'https://img-cdn.theqoo.net/PySmuF.jpg' where id = 111 and coalesce(photo_url,'') = '';
update memes set photo_url = 'https://upload2.inven.co.kr/upload/2020/02/01/bbs/i15190506499.jpg?MW=800' where id = 126 and coalesce(photo_url,'') = '';
update memes set photo_url = 'https://t1.daumcdn.net/cafeattach/mEr9/891da6a270a17f6df873a05fb29d88900a5d81e0' where id = 244 and coalesce(photo_url,'') = '';
update memes set photo_url = 'https://imgnews.naver.net/image/5327/2023/04/20/0000029638_001_20230420080201730.jpg' where id = 361 and coalesce(photo_url,'') = '';
update memes set photo_url = 'https://imgnews.naver.net/image/5785/2024/10/18/0000066756_001_20241018175617997.jpg' where id = 362 and coalesce(photo_url,'') = '';
