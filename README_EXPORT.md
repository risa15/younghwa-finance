# 영화수출포장 자금 운용 시스템 배포 & 로컬 설정 가이드

본 가이드는 기존 "영화포장" 법인의 자금 운용 시스템 소스코드를 재사용하여, 데이터가 완전히 분리된 **"영화수출포장" 법인 전용 자금 운용 시스템**을 구축하기 위한 안내서입니다.

---

## 1. 구글 스프레드시트 사본 생성 및 권한 설정

이 시스템은 구글 스프레드시트를 데이터 저장소로 사용합니다. 따라서 새로운 법인을 위한 독립된 스프레드시트가 필요합니다.

1. **기존 스프레드시트 복사**:
   * 구글 드라이브에서 기존에 사용하던 "영화포장" 자금 운용 스프레드시트를 엽니다.
   * 상단 메뉴에서 `파일` > `사본 만들기`를 클릭합니다.
   * 새 스프레드시트 이름을 **"영화수출포장 자금일보"** 등으로 설정하고 저장합니다.

2. **API 서비스 계정 공유 설정**:
   * 새로 복사된 "영화수출포장 자금일보" 스프레드시트 우측 상단의 **[공유]** 버튼을 클릭합니다.
   * 사용자 및 그룹 추가 창에 아래의 **Google 서비스 계정 이메일**을 정확히 입력합니다.
     ```text
     sheet-reader-411@money-499004.iam.gserviceaccount.com
     ```
   * 권한은 **편집자(Editor)** 또는 **뷰어(Viewer)**로 설정한 후 **[공유]** 또는 **[전송]**을 누릅니다.

3. **스프레드시트 ID 확인**:
   * 생성된 새 스프레드시트의 URL 주소창을 확인합니다.
   * URL 중 `/d/`와 `/edit` 사이에 있는 고유한 문자열이 **스프레드시트 ID**입니다.
   * 예: `https://docs.google.com/spreadsheets/d/1jQabTVJGEAdhqwFhNaePAbcLCdWHPPfVud75YRlr5tk/edit#gid=0` 일 경우 ID는 `1jQabTVJGEAdhqwFhNaePAbcLCdWHPPfVud75YRlr5tk` 입니다.

---

## 2. Vercel에 신규 사이트 배포하기

기존 GitHub 소스코드를 그대로 활용하여 독립된 웹사이트를 추가로 개설합니다.

1. **Vercel 대시보드 로그인**:
   * [Vercel](https://vercel.com)에 로그인한 뒤, `Add New...` > `Project`를 누릅니다.
2. **GitHub 저장소 연동**:
   * 기존 자금 운용 시스템의 GitHub 저장소를 선택하여 `Import` 합니다.
3. **프로젝트 설정 및 환경변수(Environment Variables) 입력**:
   * **Project Name**: `younghwa-finance-export` 등 구분하기 쉬운 이름으로 입력합니다.
   * **Framework Preset**: `Next.js` (기본값)
   * **Root Directory**: `./` (기본값)
   * **Environment Variables**: 아래의 변수들을 하나씩 추가합니다.

| 환경 변수 Key | 설정 내용 (Value) | 비고 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_COMPANY_NAME` | `영화수출포장` | 사이트 내 표시될 회사 이름 |
| `GOOGLE_SHEETS_ID` | **1단계에서 확인한 영화수출포장용 스프레드시트 ID** | 복사한 새 스프레드시트 ID |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | 기존 영화포장 프로젝트의 서비스 계정 Key 전체 (JSON) | 기존 설정값 그대로 복사 붙여넣기 |
| `LOGIN_USERNAME` | 영화수출포장 사이트에 로그인할 ID (예: `admin`) | 운영자 계정 ID |
| `LOGIN_PASSWORD` | 영화수출포장 사이트에 로그인할 비밀번호 | 운영자 비밀번호 |
| `SESSION_SECRET` | 32자 이상의 임의의 보안 영문/숫자 조합 문자열 | 예: `export-session-secret-random-key-32chars` |

4. **배포 실행**:
   * 설정 입력을 마치고 하단의 **[Deploy]** 버튼을 클릭합니다.
   * 약 1~2분 뒤 배포가 완료되면 Vercel이 제공하는 새로운 도메인 주소(예: `younghwa-finance-export.vercel.app`)로 영화수출포장 전용 시스템에 접속할 수 있습니다.

---

## 3. 로컬 환경에서 테스트 및 확인하기

배포하기 전 로컬 개발 환경에서 영화수출포장 스프레드시트와 제대로 연동되는지 테스트할 수 있습니다.

1. **환경설정 파일 백업**:
   * 현재 사용 중인 기존 `.env.local` 파일을 임시 폴더에 백업하거나 이름을 `.env.local.pack` 등으로 임시 변경합니다.
2. **영화수출포장용 설정 생성**:
   * 프로젝트 내에 제공된 `.env.export.example` 파일을 복사하여 `.env.local`을 새로 만듭니다.
   * `.env.local` 안의 `GOOGLE_SHEETS_ID`에 영화수출포장용 스프레드시트 ID를 적고, `GOOGLE_SERVICE_ACCOUNT_KEY` 등 필수값을 채웁니다.
3. **로컬 실행**:
   * 터미널에서 `npm run dev`를 실행하고 브라우저로 `http://localhost:3000`에 접속합니다.
   * 로그인 후 화면 상에 영화수출포장 시트의 데이터가 정상적으로 출력되는지 확인합니다.
4. **테스트 완료 후 복원**:
   * 로컬 테스트를 마친 뒤에는 백업해두었던 기존 `.env.local` 파일로 덮어씌워 복원합니다.
