import http from 'k6/http';

export const options = {
  vus: 60,
  duration: '30s',
};

export default function () {
  http.get('https://api.maillink.co/v1/providers');
}
