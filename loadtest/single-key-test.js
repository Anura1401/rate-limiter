// loadtest/single-key-test.js
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '15s',
};

export default function () {
  http.get('http://localhost:3000/api/hello', {
    headers: { 'x-api-key': 'load-test-key' },
  });
  sleep(0.1);
}