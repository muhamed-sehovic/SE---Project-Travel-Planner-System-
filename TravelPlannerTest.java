import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.*;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class TravelPlannerTest {

    static WebDriver driver;
    static WebDriverWait wait;

    static final String BASE_URL   = "http://localhost/SE---Project-Travel-Planner-System-";
    static final String TEST_FIRST = "User123";
    static final String TEST_LAST  = "Test123";
    static final String TEST_USER  = "usertest123";
    static final String TEST_EMAIL = "test_user@gmail.com";
    static final String TEST_PASS  = "Usertest123!";
    static final String TRIP_NAME  = "User Trip Test";

    @BeforeAll
    static void setup() {
        ChromeOptions options = new ChromeOptions();
        driver = new ChromeDriver(options);
        driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(20));
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(5));
        wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        driver.manage().window().maximize();
    }

    @AfterAll
    static void teardown() {
        if (driver != null) driver.quit();
    }

    static void goTo(String url) {
        driver.get(url);
        wait.until(d -> ((JavascriptExecutor) d)
                .executeScript("return document.readyState").equals("complete"));
    }

    static void logout() {
        driver.get(BASE_URL + "/login.html");
        try {
            ((JavascriptExecutor) driver).executeScript(
                    "localStorage.clear(); sessionStorage.clear();"
            );
            driver.manage().deleteAllCookies();
        } catch (Exception ignored) {}
        driver.navigate().refresh();
        wait.until(d -> ((JavascriptExecutor) d)
                .executeScript("return document.readyState").equals("complete"));
    }

    static void loginAs(String email, String password) {
        logout();
        goTo(BASE_URL + "/login.html");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("login-email")))
                .sendKeys(email);
        driver.findElement(By.id("login-password")).sendKeys(password);
        driver.findElement(By.id("loginBtn")).click();
        // Wait for any redirect away from login page after successful login
        wait.until(ExpectedConditions.not(
                ExpectedConditions.urlContains("login")
        ));
    }


    // ── TEST 1: User Registration ─────────────────────────────────────────────
    @Test
    @Order(1)
    void testUserRegistration() {
        logout();
        goTo(BASE_URL + "/login.html");

        wait.until(ExpectedConditions.elementToBeClickable(
                By.xpath("(//button[contains(@class,'auth-tab-btn')])[2]")
        )).click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("reg-firstname")))
                .sendKeys(TEST_FIRST);
        driver.findElement(By.id("reg-lastname")).sendKeys(TEST_LAST);
        driver.findElement(By.id("reg-username")).sendKeys(TEST_USER);
        driver.findElement(By.id("reg-email")).sendKeys(TEST_EMAIL);
        driver.findElement(By.id("reg-password")).sendKeys(TEST_PASS);
        driver.findElement(By.id("reg-confirm")).sendKeys(TEST_PASS);
        driver.findElement(By.id("reg-terms")).click();
        driver.findElement(By.id("registerBtn")).click();

        WebElement success = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.id("reg-success"))
        );
        assertTrue(success.isDisplayed(), "Registration should show success message");
    }


    // ── TEST 2: User Login ────────────────────────────────────────────────────
    @Test
    @Order(2)
    void testUserLogin() {
        logout();
        goTo(BASE_URL + "/login.html");

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("login-email")))
                .sendKeys(TEST_EMAIL);
        driver.findElement(By.id("login-password")).sendKeys(TEST_PASS);
        driver.findElement(By.id("loginBtn")).click();

        // App redirects to profile.html after login
        wait.until(ExpectedConditions.not(
                ExpectedConditions.urlContains("login")
        ));
        assertFalse(driver.getCurrentUrl().contains("login"),
                "Should redirect away from login page after successful login");
    }


    // ── TEST 3: Create a Trip ─────────────────────────────────────────────────
    @Test
    @Order(3)
    void testCreateTrip() {
        loginAs(TEST_EMAIL, TEST_PASS);
        goTo(BASE_URL + "/mytrips.html");

        wait.until(ExpectedConditions.elementToBeClickable(
                By.cssSelector("button.btn-create-trip")
        )).click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("f-name")))
                .sendKeys(TRIP_NAME);

        JavascriptExecutor js = (JavascriptExecutor) driver;
        js.executeScript("document.getElementById('f-start').value = '2026-10-01'");
        js.executeScript("document.getElementById('f-end').value = '2026-10-14'");

        driver.findElement(By.id("tripFormBtn")).click();

        boolean tripCreated = wait.until(d ->
                d.getPageSource().contains(TRIP_NAME)
        );
        assertTrue(tripCreated, "New trip should appear in the dashboard");
    }


    // ── TEST 4: Login Fails with Wrong Password ───────────────────────────────
    @Test
    @Order(4)
    void testLoginWithWrongPassword() {
        logout();
        goTo(BASE_URL + "/login.html");

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("login-email")))
                .sendKeys(TEST_EMAIL);
        driver.findElement(By.id("login-password")).sendKeys("WrongPassword000");
        driver.findElement(By.id("loginBtn")).click();

        WebElement error = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.id("login-error"))
        );
        assertTrue(error.isDisplayed(), "Error message should appear for wrong password");
        assertTrue(driver.getCurrentUrl().contains("login"),
                "Should stay on login page with wrong password");
    }


    // ── TEST 5: Trip Form Validation (empty fields) ───────────────────────────
    @Test
    @Order(5)
    void testTripFormValidation() {
        loginAs(TEST_EMAIL, TEST_PASS);
        goTo(BASE_URL + "/mytrips.html");

        wait.until(ExpectedConditions.elementToBeClickable(
                By.cssSelector("button.btn-create-trip")
        )).click();

        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("tripFormBtn")))
                .click();

        WebElement nameError = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.id("err-name"))
        );
        assertTrue(nameError.isDisplayed(), "Name validation error should be shown");
        assertTrue(driver.findElement(By.id("f-name")).isDisplayed(),
                "Modal should stay open when required fields are empty");
    }
}