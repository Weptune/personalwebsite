import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

# Enable logging of browser console messages
chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

driver = webdriver.Chrome(options=chrome_options)

try:
    print("Navigating to home page...")
    driver.get("http://localhost:1235/")
    time.sleep(2)

    print("Clearing local storage to start clean...")
    driver.execute_script("window.localStorage.clear();")
    driver.refresh()
    time.sleep(2)

    # 1. Check if vote area is visible
    vote_area = driver.find_element(By.ID, "poll-vote-area")
    print("Vote area is hidden:", vote_area.get_attribute("hidden"))

    # 2. Select "The Sun" radio button
    print("Selecting 'The Sun'...")
    sun_radio = driver.find_element(By.CSS_SELECTOR, "input[value='The Sun']")
    # Click via JS because overlay might catch standard click
    driver.execute_script("arguments[0].click();", sun_radio)
    time.sleep(2)

    # 3. Print results area content
    results_area = driver.find_element(By.ID, "poll-results-area")
    print("Results HTML after voting 'The Sun':")
    print(results_area.get_attribute("innerHTML"))

    # 4. Click "Change vote"
    print("Clicking 'Change vote'...")
    change_btn = driver.find_element(By.ID, "poll-change-vote")
    driver.execute_script("arguments[0].click();", change_btn)
    time.sleep(1)

    # 5. Check if vote area is visible again
    print("Vote area is hidden after 'Change vote':", vote_area.get_attribute("hidden"))

    # 6. Select "The Ocean" radio button
    print("Selecting 'The Ocean'...")
    ocean_radio = driver.find_element(By.CSS_SELECTOR, "input[value='The Ocean']")
    driver.execute_script("arguments[0].click();", ocean_radio)
    time.sleep(2)

    # 7. Print results area content again
    print("Results HTML after changing vote to 'The Ocean':")
    print(results_area.get_attribute("innerHTML"))

    # 8. Retrieve and print browser console logs
    print("\n--- BROWSER CONSOLE LOGS ---")
    for entry in driver.get_log('browser'):
        print(entry)

except Exception as e:
    print("Error:", e)
finally:
    driver.quit()
