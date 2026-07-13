-- 바꾼 5개 덱만 코드→DB 반영 (2026-07-13, short 라벨 포함). 나머지 7개 덱과 sort/is_public은 건드리지 않음.
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.

-- [선택] 실행 전 현재 5개 덱 백업(결과를 따로 저장해두면 롤백 가능):
--   select id, title, data from decks where id in ('dirty-partner', 'gross-food', 'kakao', 'salty-bland', 'tomato-vomit');

-- dirty-partner
insert into decks (id, title, emoji, data, is_public, updated_at)
values ('dirty-partner', '평생 함께라면? 털털이 vs 결벽러', '🧼', '{"id":"dirty-partner","title":"평생 함께라면? 털털이 vs 결벽러","icon":"🧼","type":"person","a":{"name":"털털이","emoji":"💨","penalties":[{"strength":2,"text":"뭘 흘리고 묻혀도 태연해 남들이 지저분하다 여김","short":"묻혀도 태연"},{"strength":3,"text":"방이 늘 어질러져 필요한 걸 매번 못 찾음","short":"물건 자주 실종"},{"strength":4,"text":"유통기한 지난 음식도 무심코 먹어 종종 배탈이 남","short":"유통기한 배탈"},{"strength":5,"text":"옷 얼룩에 무신경해 소개팅에서 감점","short":"얼룩에 소개팅 감점"},{"strength":6,"text":"청소를 미루다 결국 몰아서 대청소 지옥을 겪음","short":"몰아치는 대청소"},{"strength":7,"text":"위생 관념이 다른 연인과 매번 부딪힘","short":"위생차로 연인 충돌"},{"strength":8,"text":"냄새에 둔감해 남이 말해줘야 알아차림","short":"냄새 둔감"},{"strength":9,"text":"손을 잘 안 씻어 감기·배탈을 달고 삶","short":"손 안 씻어 잔병"},{"strength":10,"text":"''게으르다''는 오해를 평생 받음","short":"게으름 오해 평생"}]},"b":{"name":"결벽러","emoji":"🧴","penalties":[{"strength":2,"text":"조금만 지저분해도 참지 못해 늘 예민해짐","short":"티끌에도 예민"},{"strength":3,"text":"남이 만진 물건·손잡이를 못 만져 생활이 불편함","short":"손잡이 공포"},{"strength":4,"text":"청소·소독에 매일 몇 시간과 돈을 쏟아부음","short":"매일 청소에 탕진"},{"strength":5,"text":"대중교통·공용 화장실을 쓸 때마다 스트레스를 받음","short":"공용시설 스트레스"},{"strength":6,"text":"여행을 가도 숙소 위생 때문에 잠을 설침","short":"숙소 위생에 뜬눈"},{"strength":7,"text":"친구가 집에 놀러 오는 게 반갑지 않음","short":"손님 오면 부담"},{"strength":8,"text":"손을 너무 자주 씻어 피부가 트고 갈라짐","short":"손 트고 갈라짐"},{"strength":9,"text":"연인의 사소한 습관 하나에도 예민하게 굴게 됨","short":"사소한 습관에 발끈"},{"strength":10,"text":"''유난 떤다''는 소리를 평생 들음","short":"유난 소리 평생"}]},"resultCards":{"a":{"extreme":{"label":"편한 게 최고라 끝까지 눈감은 털털이파"},"mild":{"label":"편한 건 좋은데 위생은 걸려 저울질하는 털털이파"}},"b":{"extreme":{"label":"먼지 한 톨까지 잡고 사는 결벽러파"},"mild":{"label":"깔끔한 건 좋은데 가끔 숨 막히는 결벽러파"}}}}'::jsonb, true, now())
on conflict (id) do update set
  title = excluded.title,
  emoji = excluded.emoji,
  data = excluded.data,
  updated_at = excluded.updated_at;

-- gross-food
insert into decks (id, title, emoji, data, is_public, updated_at)
values ('gross-food', '평생 이것만: 똥맛 카레 vs 카레맛 똥', '🍛', '{"id":"gross-food","title":"평생 이것만: 똥맛 카레 vs 카레맛 똥","icon":"🍛","type":"attribute","penaltyStyleOverride":"long","a":{"name":"똥맛 카레","emoji":"💩","penalties":[{"strength":2,"text":"겉은 멀쩡한 카레인데 입에 넣으면 그 맛이 확 퍼짐","short":"겉만 멀쩡한 카레"},{"strength":3,"text":"하루 한 끼는 무조건 이걸로 먹어야 함","short":"하루 한 끼 강제"},{"strength":4,"text":"남들 앞에서 아무렇지 않게 맛있는 척 먹어야 함","short":"맛있는 척 연기"},{"strength":5,"text":"평생 다른 카레는 못 먹음","short":"다른 카레 금지"},{"strength":6,"text":"먹고 나면 그 맛이 하루 종일 입에 맴돎","short":"종일 입에 그 맛"},{"strength":7,"text":"냄새는 정상 카레라 남들은 맛있는 줄 앎","short":"남들은 정상인 줄"},{"strength":8,"text":"다 먹어도 배는 안 부름","short":"먹어도 배 안 참"},{"strength":9,"text":"소개팅 첫 메뉴가 이걸로 정해짐","short":"소개팅 첫 메뉴"},{"strength":10,"text":"리필은 무제한인데 남기면 벌칙이 있음","short":"남기면 벌칙"}]},"b":{"name":"카레맛 똥","emoji":"🍛","penalties":[{"strength":2,"text":"겉모습·냄새는 진짜 그것인데 맛만 카레임","short":"정체는 그것"},{"strength":3,"text":"하루 한 끼는 무조건 이걸로 먹어야 함","short":"하루 한 끼 강제"},{"strength":4,"text":"남이 보면 대체 뭘 먹나 경악함","short":"보면 다들 경악"},{"strength":5,"text":"맛은 괜찮은데 먹는 내 표정 관리가 안 됨","short":"표정 관리 실패"},{"strength":6,"text":"가족과 겸상하며 같이 먹어야 함","short":"가족과 겸상"},{"strength":7,"text":"다 먹어도 배는 안 부름","short":"먹어도 배 안 참"},{"strength":8,"text":"손·그릇에 묻으면 씻어도 찝찝함이 남음","short":"묻으면 영 찝찝"},{"strength":9,"text":"리필은 공짜인데 남기면 두 개로 늘어남","short":"남기면 두 개로"},{"strength":10,"text":"맛있다고 인정하는 순간 자괴감이 몰려옴","short":"맛 인정=자괴감"}]},"resultCards":{"a":{"extreme":{"label":"맛은 지옥이어도 몸은 챙긴 똥맛 카레파"},"mild":{"label":"냄새는 힘든데 그래도 진짜 음식이라 참는 똥맛 카레파"}},"b":{"extreme":{"label":"정체를 알면서도 맛에 굴복한 카레맛 똥파"},"mild":{"label":"맛은 좋은데 정체가 자꾸 걸리는 카레맛 똥파"}}}}'::jsonb, true, now())
on conflict (id) do update set
  title = excluded.title,
  emoji = excluded.emoji,
  data = excluded.data,
  updated_at = excluded.updated_at;

-- kakao
insert into decks (id, title, emoji, data, is_public, updated_at)
values ('kakao', '카톡 3초컷 애인 vs 카톡 3일컷 애인', '💬', '{"id":"kakao","title":"카톡 3초컷 애인 vs 카톡 3일컷 애인","icon":"💬","type":"person","a":{"name":"집착러","emoji":"📲","penalties":[{"strength":2,"text":"답장이 1분만 늦어도 무슨 일 있냐고 다그침","short":"1분 늦으면 추궁"},{"strength":3,"text":"하루에도 수십 번 실시간 보고를 요구함","short":"실시간 보고 요구"},{"strength":4,"text":"내 위치·일정을 늘 확인하려 함","short":"위치·일정 감시"},{"strength":5,"text":"친구들과 있을 때도 계속 연락이 옴","short":"모임에도 연락 폭탄"},{"strength":6,"text":"답장 속도로 애정을 가늠해 부담스러움","short":"답장속도=애정"},{"strength":7,"text":"싸우면 그 집착이 두 배가 됨","short":"싸우면 집착 폭증"},{"strength":8,"text":"답장만 빼면 완벽한 사람이라 헤어지긴 아까움","short":"답장 빼면 완벽"},{"strength":9,"text":"혼자만의 시간을 갖기가 어려움","short":"혼자 시간 실종"},{"strength":10,"text":"이 패턴이 사귀는 내내 안 바뀜","short":"평생 그대로"}]},"b":{"name":"잠수함","emoji":"🌊","penalties":[{"strength":2,"text":"답장이 며칠씩 늦어 늘 애가 탐","short":"며칠째 무응답"},{"strength":3,"text":"중요한 날에도 연락이 뜸함","short":"중요한 날도 잠수"},{"strength":4,"text":"살아 있나 걱정될 만큼 잠수를 탐","short":"생사 확인 불가"},{"strength":5,"text":"내가 매달리는 모양새가 되어 자존심이 상함","short":"나만 매달리는 꼴"},{"strength":6,"text":"데이트 약속을 잡기까지 며칠이 걸림","short":"약속잡기 며칠"},{"strength":7,"text":"애정이 식은 건지 헷갈려 늘 불안함","short":"식었나 늘 불안"},{"strength":8,"text":"답장만 빼면 완벽한 사람이라 헤어지긴 아까움","short":"답장 빼면 완벽"},{"strength":9,"text":"장거리라 연락이 유일한 소통인데도 그럼","short":"장거리에도 잠수"},{"strength":10,"text":"이 패턴이 사귀는 내내 안 바뀜","short":"평생 그대로"}]},"resultCards":{"a":{"extreme":{"label":"24시간 감시받아도 사랑이면 됐다는 집착러파"},"mild":{"label":"관심은 좋은데 숨은 좀 쉬고 싶은 집착러파"}},"b":{"extreme":{"label":"혼자가 편하면 각방도 좋다는 잠수함파"},"mild":{"label":"자유는 좋은데 가끔 서운한 잠수함파"}}}}'::jsonb, true, now())
on conflict (id) do update set
  title = excluded.title,
  emoji = excluded.emoji,
  data = excluded.data,
  updated_at = excluded.updated_at;

-- salty-bland
insert into decks (id, title, emoji, data, is_public, updated_at)
values ('salty-bland', '모든 음식이 다 짬 vs 모든 음식이 다 밍밍함', '🧂', '{"id":"salty-bland","title":"모든 음식이 다 짬 vs 모든 음식이 다 밍밍함","icon":"🧂","type":"attribute","penaltyStyleOverride":"long","a":{"name":"짠맛지옥","emoji":"🧂","penalties":[{"strength":2,"text":"모든 음식이 소금 덩어리처럼 짜게 느껴짐","short":"다 소금 덩어리"},{"strength":3,"text":"물조차 짜게 느껴져 갈증이 안 가심","short":"물조차 짜서 갈증"},{"strength":4,"text":"디저트·과일도 예외 없이 짬","short":"디저트도 다 짬"},{"strength":5,"text":"남들은 정상으로 먹는 걸 옆에서 지켜봐야 함","short":"남들 정상식 구경"},{"strength":6,"text":"직접 싱겁게 요리해도 결과는 똑같이 짬","short":"싱겁게 해도 짬"},{"strength":7,"text":"자꾸 물을 마셔 늘 붓고 속이 더부룩함","short":"붓고 더부룩"},{"strength":8,"text":"미슐랭 음식도 똑같이 짬","short":"미슐랭도 짬"},{"strength":9,"text":"먹는 자리가 유독 많은 삶임","short":"밥자리마다 고역"},{"strength":10,"text":"평생 그 상태가 안 바뀜","short":"평생 그대로"}]},"b":{"name":"무맛지옥","emoji":"🥣","penalties":[{"strength":2,"text":"모든 음식이 물 씹는 것처럼 아무 맛도 없음","short":"다 물 씹는 맛"},{"strength":3,"text":"아무리 먹어도 만족감이 없어 자꾸 더 먹게 됨","short":"만족 없어 과식"},{"strength":4,"text":"매운 것·단 것 같은 자극도 하나도 안 느껴짐","short":"매운·단맛도 0"},{"strength":5,"text":"좋아하던 음식조차 먹을 이유가 사라짐","short":"먹을 이유 상실"},{"strength":6,"text":"남들이 ''맛있다''며 행복해하는 걸 이해 못 함","short":"남들 행복 미스터리"},{"strength":7,"text":"먹는 즐거움이 없어 끼니가 노동이 됨","short":"끼니가 노동"},{"strength":8,"text":"미슐랭 음식도 똑같이 무맛임","short":"미슐랭도 무맛"},{"strength":9,"text":"맛 표현을 못 해 대화에서 겉돎","short":"맛 얘기서 겉돎"},{"strength":10,"text":"평생 그 상태가 안 바뀜","short":"평생 그대로"}]},"resultCards":{"a":{"extreme":{"label":"흰쌀밥 없인 물도 못 넘기는 짠맛지옥러"},"mild":{"label":"남몰래 소금 뿌리다 걸리는 짠맛러"}},"b":{"extreme":{"label":"캡사이신 없인 물도 맹맹한 무맛지옥러"},"mild":{"label":"남몰래 청양고추 까 넣는 무맛러"}}}}'::jsonb, true, now())
on conflict (id) do update set
  title = excluded.title,
  emoji = excluded.emoji,
  data = excluded.data,
  updated_at = excluded.updated_at;

-- tomato-vomit
insert into decks (id, title, emoji, data, is_public, updated_at)
values ('tomato-vomit', '평생 이것만: 토맛 토마토 vs 토마토맛 토', '🍅', '{"id":"tomato-vomit","title":"평생 이것만: 토맛 토마토 vs 토마토맛 토","icon":"🍅","type":"attribute","penaltyStyleOverride":"long","a":{"name":"토맛 토마토","emoji":"🍅","penalties":[{"strength":2,"text":"겉은 싱싱한 토마토인데 씹으면 그 맛이 확 퍼짐","short":"겉만 싱싱 토마토"},{"strength":3,"text":"하루 한 개는 무조건 먹어야 함","short":"하루 한 개 강제"},{"strength":4,"text":"남들 앞에서 아무렇지 않게 먹어야 함","short":"태연한 척 먹기"},{"strength":5,"text":"평생 다른 토마토 요리는 못 먹음","short":"토마토요리 금지"},{"strength":6,"text":"먹고 나면 그 맛이 30분간 입에 맴돎","short":"30분 입에 그 맛"},{"strength":7,"text":"케첩·파스타 등 토마토 든 음식도 다 그 맛임","short":"케첩·파스타도 그 맛"},{"strength":8,"text":"눈을 감고 먹어도 뇌는 정체를 앎","short":"눈 감아도 뇌는 앎"},{"strength":9,"text":"냄새는 정상 토마토라 남들은 멀쩡한 줄 앎","short":"남들은 정상인 줄"},{"strength":10,"text":"리필은 공짜인데 남기면 두 개로 늘어남","short":"남기면 두 개로"}]},"b":{"name":"토마토맛 토","emoji":"🤮","penalties":[{"strength":2,"text":"겉모습·냄새는 진짜 그것인데 맛만 토마토임","short":"정체는 그것"},{"strength":3,"text":"하루 한 개는 무조건 먹어야 함","short":"하루 한 개 강제"},{"strength":4,"text":"남이 보면 대체 뭘 먹나 경악함","short":"보면 다들 경악"},{"strength":5,"text":"맛은 괜찮은데 먹는 내 표정 관리가 안 됨","short":"표정 관리 실패"},{"strength":6,"text":"정체를 아는 순간 뇌가 계속 거부함","short":"뇌가 계속 거부"},{"strength":7,"text":"소개팅·가족 식사 자리에서 먹게 됨","short":"소개팅서도 강제"},{"strength":8,"text":"손·그릇에 묻으면 씻어도 찝찝함이 남음","short":"묻으면 영 찝찝"},{"strength":9,"text":"리필은 공짜인데 남기면 두 개로 늘어남","short":"남기면 두 개로"},{"strength":10,"text":"맛있다고 인정하는 순간 자괴감이 몰려옴","short":"맛 인정=자괴감"}]},"resultCards":{"a":{"extreme":{"label":"온 동네에 ''토마토 그 사람''으로 박제된 토맛 토마토파"},"mild":{"label":"유명해지긴 했는데 발 뺄까 고민하는 토맛 토마토파"}},"b":{"extreme":{"label":"세상이 등 돌려도 그 맛에 대물림까지 간 토마토맛 토파"},"mild":{"label":"맛엔 넘어갔는데 사람들 시선이 자꾸 걸리는 토마토맛 토파"}}}}'::jsonb, true, now())
on conflict (id) do update set
  title = excluded.title,
  emoji = excluded.emoji,
  data = excluded.data,
  updated_at = excluded.updated_at;

