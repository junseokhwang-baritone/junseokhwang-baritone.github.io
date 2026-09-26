# Junseok Hwang · Baritone

바리톤 황준석 공식 웹사이트 (GitHub Pages)

## 관리자: 사진 · 영상 · 공연 일정 추가하기

이 저장소에 **쓰기 권한이 있는 GitHub 계정**만 수정할 수 있습니다.

1. https://app.pagescms.org 접속 → **Sign in with GitHub**
2. `junseok-hwang` 저장소 선택
3. 왼쪽 메뉴에서 편집할 항목 선택 → 추가/수정 → **Save**
4. 저장하면 1~2분 뒤 사이트에 자동 반영됩니다.

| 메뉴 | 하는 일 |
|---|---|
| 공연 일정 | 날짜·공연명·장소·**티켓 예매 링크** 입력. 날짜가 지나면 자동으로 "Past Performances"로 이동 |
| 영상 | YouTube 링크를 붙여넣고 연도·분류 선택. "대표 영상" 체크 시 상단에 크게 표시 |
| 사진 | 사진 업로드 + 설명 |
| 수상 / 배역 / 학력 | 레쥬메 업데이트 시 수정 |

> 영상 파일은 GitHub에 직접 올리지 말고 YouTube에 업로드(비공개 링크 = "일부 공개"도 가능) 후 링크를 추가하세요.
> 사진은 한 장당 1~2MB 이하(가로 2000px 정도)를 권장합니다.

### 관리자 추가
GitHub 저장소 → Settings → Collaborators → **Add people** → 준석이 GitHub 아이디 초대

## 구조

```
index.html        페이지
css/style.css     디자인
js/main.js        화면 렌더링
content/*.json    모든 콘텐츠 (Pages CMS가 편집하는 파일)
images/           사진
.pages.yml        관리자 편집 화면 설정
```

일정 디자인 미리보기: 주소 뒤에 `?demo=1` 을 붙이면 샘플 공연 일정이 표시됩니다.

로컬 미리보기: `python3 -m http.server` 후 http://localhost:8000
