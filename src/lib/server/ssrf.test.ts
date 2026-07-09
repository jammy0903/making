import { describe, it, expect } from 'vitest';
import { isPrivateIp } from './ssrf';

describe('isPrivateIp - IPv4', () => {
	it('루프백·사설·링크로컬·메타데이터를 차단', () => {
		expect(isPrivateIp('127.0.0.1')).toBe(true);
		expect(isPrivateIp('10.0.0.5')).toBe(true);
		expect(isPrivateIp('192.168.1.1')).toBe(true);
		expect(isPrivateIp('172.16.0.1')).toBe(true);
		expect(isPrivateIp('172.31.255.255')).toBe(true);
		expect(isPrivateIp('169.254.169.254')).toBe(true); // 클라우드 메타데이터
		expect(isPrivateIp('100.64.0.1')).toBe(true); // CGNAT
		expect(isPrivateIp('0.0.0.0')).toBe(true);
	});

	it('공개 IPv4 는 허용', () => {
		expect(isPrivateIp('8.8.8.8')).toBe(false);
		expect(isPrivateIp('1.1.1.1')).toBe(false);
		expect(isPrivateIp('172.15.0.1')).toBe(false); // 172.16/12 경계 밖
		expect(isPrivateIp('172.32.0.1')).toBe(false);
		expect(isPrivateIp('93.184.216.34')).toBe(false); // example.com
	});
});

describe('isPrivateIp - IPv6', () => {
	it('루프백·링크로컬·ULA·IPv4매핑을 차단', () => {
		expect(isPrivateIp('::1')).toBe(true);
		expect(isPrivateIp('::')).toBe(true);
		expect(isPrivateIp('fe80::1')).toBe(true);
		expect(isPrivateIp('fc00::1')).toBe(true);
		expect(isPrivateIp('fd12:3456::1')).toBe(true);
		expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true); // IPv4 매핑
	});

	it('공개 IPv6 는 허용', () => {
		expect(isPrivateIp('2606:4700:4700::1111')).toBe(false); // cloudflare
		expect(isPrivateIp('2001:4860:4860::8888')).toBe(false); // google
	});
});

describe('isPrivateIp - 비정상 입력', () => {
	it('IP 로 파싱 안 되면 안전측(차단)', () => {
		expect(isPrivateIp('not-an-ip')).toBe(true);
		expect(isPrivateIp('')).toBe(true);
	});
});
