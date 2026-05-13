-- Creates the test database alongside the dev database when the container first starts
CREATE DATABASE bms_test;
GRANT ALL PRIVILEGES ON DATABASE bms_test TO bms;
