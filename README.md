# AXON 台灣亞上 設計作品網站

網址：https://design.axon-tw.com

純 HTML／CSS／JS，不需要編譯。所有文字與作品都放在 `content/` 裡的兩個 JSON 檔，用 Pages CMS 後台（https://app.pagescms.org）編輯。

## 日常更新
1. 到 https://app.pagescms.org ，用 GitHub 帳號登入，選擇 axon-site。
2. 「作品」→ 新增一筆，填資料、上傳圖片 → Save。約一兩分鐘後網站更新。
3. 「網站資訊」可修改標語、聯絡資訊、服務項目、作品分類的英文名稱與順序。

## 注意
- 作品的「網址代稱」不可重複，建議英文小寫，例如 `abc-esg-2025`。
- 圖片建議先壓縮（寬 2000px 以內、JPG），可用 squoosh.app。
- 新增或刪除分類：需同時改後台「作品分類」與 `.pages.yml` 裡 categories 的 values 清單，中文名稱要一字不差。
- 要修改版面時，請先按 Code → Download ZIP 下載最新版本再交給 Claude，避免蓋掉後台新增的作品。

## 品牌設定
- 標準色寫在 `assets/style.css` 最上方：Black 6C #101820、389C #CEDF00、422C #9FA2A3。
- LOGO：`images/brand/logo-white.svg`（白色去背）。
