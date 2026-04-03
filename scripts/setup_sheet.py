"""
rugondee-autopost: setup_sheet.py
ตั้งค่า Google Sheet ครั้งแรก — สร้าง header row และ sample data
รู้ก่อนดี (RuGonDee) | rugondee.com
"""

import os
import json
from datetime import date, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build

GSHEET_ID    = os.environ["GSHEET_ID"]
GSHEET_CREDS = os.environ["GSHEET_CREDS_JSON"]
SHEET_NAME   = "Content"

HEADERS = [
    "day_number", "scheduled_date", "day_th", "platform",
    "title", "meta_description", "url_slug", "focus_keyword",
    "category", "post_body_seed", "image_file",
    "status", "wp_url", "posted_at", "notes"
]

SAMPLE_ROWS = [
    [
        "1",
        date.today().strftime("%Y-%m-%d"),
        "วันแรก",
        "Blog/SEO",
        "ตรวจ STI ต้องรู้อะไรบ้าง? แนะนำสำหรับผู้หญิงวัยทำงาน",
        "ตรวจโรคติดต่อทางเพศสัมพันธ์ไม่ใช่เรื่องน่าอาย รู้ก่อน รักษาได้ก่อน",
        "ตรวจ-sti-ผู้หญิง",
        "ตรวจ STI, โรคติดต่อทางเพศสัมพันธ์, ตรวจโรคทางเพศ",
        "Sexual Health",
        "STI screening, สุขภาพเพศหญิง, ตรวจสุขภาพประจำปี",
        "",
        "Ready",
        "", "", ""
    ],
    [
        "2",
        (date.today() + timedelta(days=1)).strftime("%Y-%m-%d"),
        "วันที่สอง",
        "Blog/SEO",
        "GLP-1 คืออะไร? ลดน้ำหนักได้จริงไหม สำหรับคนไทย",
        "GLP-1 ยาลดน้ำหนักที่กำลังเป็นที่พูดถึง ปลอดภัยแค่ไหน ใครเหมาะกับยานี้",
        "glp1-ลดน้ำหนัก-คนไทย",
        "GLP-1, ยาลดน้ำหนัก, semaglutide",
        "GLP-1 & ฮอร์โมน",
        "น้ำหนัก, BMI, อาหาร, ออกกำลังกาย",
        "",
        "Ready",
        "", "", ""
    ],
]

def get_service():
    creds_info = json.loads(GSHEET_CREDS)
    creds = service_account.Credentials.from_service_account_info(
        creds_info,
        scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )
    return build("sheets", "v4", credentials=creds).spreadsheets()

def setup():
    service = get_service()

    # เขียน header
    all_rows = [HEADERS] + SAMPLE_ROWS
    service.values().update(
        spreadsheetId=GSHEET_ID,
        range=f"{SHEET_NAME}!A1",
        valueInputOption="RAW",
        body={"values": all_rows}
    ).execute()

    # Format header row — bold + background
    sheet_meta = service.get(spreadsheetId=GSHEET_ID).execute()
    sheet_id = None
    for s in sheet_meta["sheets"]:
        if s["properties"]["title"] == SHEET_NAME:
            sheet_id = s["properties"]["sheetId"]
            break

    if sheet_id is not None:
        service.batchUpdate(
            spreadsheetId=GSHEET_ID,
            body={"requests": [
                {
                    "repeatCell": {
                        "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1},
                        "cell": {
                            "userEnteredFormat": {
                                "backgroundColor": {"red": 0.2, "green": 0.6, "blue": 0.4},
                                "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
                            }
                        },
                        "fields": "userEnteredFormat(backgroundColor,textFormat)"
                    }
                },
                {
                    "updateSheetProperties": {
                        "properties": {"sheetId": sheet_id, "gridProperties": {"frozenRowCount": 1}},
                        "fields": "gridProperties.frozenRowCount"
                    }
                }
            ]}
        ).execute()

    print(f"✅ Sheet '{SHEET_NAME}' ตั้งค่าสำเร็จ!")
    print(f"   - Headers: {len(HEADERS)} columns")
    print(f"   - Sample rows: {len(SAMPLE_ROWS)} rows")
    print(f"   - URL: https://docs.google.com/spreadsheets/d/{GSHEET_ID}")

if __name__ == "__main__":
    setup()
