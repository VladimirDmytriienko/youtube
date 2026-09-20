from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
import time, shutil

opts = Options()
opts.add_argument('--headless')
opts.add_argument('--disable-gpu')
opts.add_experimental_option('mobileEmulation', {'deviceName': 'iPhone 14 Pro'})

driver = webdriver.Edge(options=opts)
try:
    driver.get('http://127.0.0.1:3000/')
    time.sleep(2.5)

    # 1. Library Screen
    driver.save_screenshot('e:/youtube/nextjs_iphone_library.png')
    shutil.copy2('e:/youtube/nextjs_iphone_library.png', 'C:/Users/Владимир/.gemini/antigravity/brain/b1ef3f96-8ce7-4443-b8db-173c178c4149/nextjs_iphone_library.png')
    print('1. Captured Library')

    # 2. Calendar Tab
    nav_btns = driver.find_elements(By.CSS_SELECTOR, "div.fixed.bottom-0 button")
    if nav_btns:
        driver.execute_script("arguments[0].click();", nav_btns[0]) # Calendar
        time.sleep(1)
        driver.save_screenshot('e:/youtube/nextjs_iphone_calendar.png')
        shutil.copy2('e:/youtube/nextjs_iphone_calendar.png', 'C:/Users/Владимир/.gemini/antigravity/brain/b1ef3f96-8ce7-4443-b8db-173c178c4149/nextjs_iphone_calendar.png')
        print('2. Captured Calendar')

    # 3. Converter Tab
    if len(nav_btns) >= 4:
        driver.execute_script("arguments[0].click();", nav_btns[3]) # Converter
        time.sleep(1.5)
        driver.save_screenshot('e:/youtube/nextjs_iphone_converter.png')
        shutil.copy2('e:/youtube/nextjs_iphone_converter.png', 'C:/Users/Владимир/.gemini/antigravity/brain/b1ef3f96-8ce7-4443-b8db-173c178c4149/nextjs_iphone_converter.png')
        print('3. Captured Converter')

    # 4. Open Post Drawer (click center + button, nav_btns[2])
    if len(nav_btns) >= 3:
        driver.execute_script("arguments[0].click();", nav_btns[2]) # Floating +
        time.sleep(2)
        driver.save_screenshot('e:/youtube/nextjs_iphone_drawer_en.png')
        shutil.copy2('e:/youtube/nextjs_iphone_drawer_en.png', 'C:/Users/Владимир/.gemini/antigravity/brain/b1ef3f96-8ce7-4443-b8db-173c178c4149/nextjs_iphone_drawer_en.png')
        print('4. Captured Drawer (EN metadata & Frame Picker)')

        # Switch to Ukrainian in Drawer
        driver.execute_script("""
            const uaBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('UA') && b.textContent.includes('🇺🇦'));
            if (uaBtn) uaBtn.click();
        """)
        time.sleep(1)
        driver.save_screenshot('e:/youtube/nextjs_iphone_drawer_ua.png')
        shutil.copy2('e:/youtube/nextjs_iphone_drawer_ua.png', 'C:/Users/Владимир/.gemini/antigravity/brain/b1ef3f96-8ce7-4443-b8db-173c178c4149/nextjs_iphone_drawer_ua.png')
        print('5. Captured Drawer (UA metadata)')

    # Check console errors
    logs = driver.get_log('browser')
    errors = [l for l in logs if l['level'] == 'SEVERE' and 'favicon.ico' not in l['message']]
    print(f'Browser console severe errors: {len(errors)}')
    for e in errors:
        print('Console error:', e['message'])

finally:
    driver.quit()
