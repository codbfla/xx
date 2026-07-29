# 별자리 로또 챗봇

생년월일을 입력하면 별자리를 계산해서 로또 번호를 뽑고, 번호를 왜 골랐는지 챗봇처럼 설명하는 웹앱입니다.

## 실행

1. OpenAI API 키를 환경 변수로 설정합니다.

```bash
export OPENAI_API_KEY="your_api_key"
```

2. 서버를 실행합니다.

```bash
npm start
```

3. 브라우저에서 `http://localhost:3000`을 엽니다.

## Vercel 배포

1. 이 GitHub 저장소를 Vercel에 Import합니다.
2. Vercel 프로젝트 설정의 Environment Variables에 `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 추가합니다. 필요하면 `OPENAI_MODEL`을 `gpt-5.4-mini`로 지정할 수 있습니다. Vercel의 환경 변수는 프로젝트 설정에서 관리하고, 새 배포에 적용됩니다. citeturn0search0turn0search1
3. `main` 브랜치에 푸시하면 Vercel이 새 Production Deployment를 만듭니다. Vercel 프로젝트는 연결된 Git 저장소의 커밋마다 배포를 생성합니다. citeturn0search4turn0search0
4. 배포가 완료되면 Vercel 대시보드의 Deployments에서 URL을 확인합니다. 프로젝트 개요 페이지에서도 최신 배포와 도메인을 볼 수 있습니다. citeturn0search4turn0search0

## Supabase SQL

- `supabase.sql` 파일을 Supabase SQL Editor에 그대로 실행하면 `public.lotto_draws` 테이블이 생성됩니다.
- 이 테이블은 추첨 날짜, 별자리, 번호, 보너스, 설명을 저장합니다.
- 서버는 `SUPABASE_SERVICE_ROLE_KEY`를 사용해 `lotto_draws`에 insert 합니다. Supabase의 서비스 롤 키는 서버 전용으로 사용해야 하며 브라우저에 노출하면 안 됩니다. citeturn0search0turn0search1turn0search6

## 모델

기본 모델은 `gpt-5.4-mini`입니다. 다른 모델을 쓰려면 `OPENAI_MODEL` 환경 변수를 바꾸면 됩니다.

## 동작 방식

- 생년월일로 별자리를 계산합니다.
- 별자리와 생년월일을 시드로 사용해 1~45 사이 숫자 6개와 보너스 1개를 생성합니다.
- OpenAI Responses API가 추첨 이유를 한국어로 설명합니다.
- API 키가 없거나 응답 생성에 실패하면 로컬 규칙 기반 설명으로 자동 대체합니다.

## 화면 구성

- 왼쪽: 대화형 챗봇 로그
- 오른쪽: 별자리, 성향 키워드, 추첨 번호, 설명 요약
