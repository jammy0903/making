/**
 * SSRF(Server-Side Request Forgery) 방어 유틸.
 *
 * image-proxy 는 클라이언트가 넘긴 임의 URL 을 서버가 대신 fetch 한다.
 * 프로토콜만 검사하면 `localhost`·사설 대역·클라우드 메타데이터
 * (169.254.169.254) 로의 요청을 막지 못해 내부망 스캐닝·자격증명 탈취에
 * 악용될 수 있다. 여기서 호스트를 DNS 해석해 내부망 IP 로 향하면 차단한다.
 *
 * ⚠️ 한계: DNS 재바인딩(해석 시점과 fetch 시점의 IP 가 달라지는) 은 완전히
 * 막지 못한다. 완전 방어에는 해석된 IP 를 고정해 연결해야 한다.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/** 사설·루프백·링크로컬·예약 대역 IPv4 인지. */
function isPrivateIpv4(ip: string): boolean {
	const p = ip.split('.').map(Number);
	if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
	const [a, b] = p;
	if (a === 0) return true; // 0.0.0.0/8
	if (a === 10) return true; // 10.0.0.0/8
	if (a === 127) return true; // 127.0.0.0/8 루프백
	if (a === 169 && b === 254) return true; // 169.254.0.0/16 링크로컬(메타데이터 169.254.169.254)
	if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
	if (a === 192 && b === 168) return true; // 192.168.0.0/16
	if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
	if (a === 192 && b === 0) return true; // 192.0.0.0/24 (IETF 프로토콜 할당)
	if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 벤치마킹
	if (a >= 224) return true; // 224.0.0.0/4 멀티캐스트 + 240/4 예약
	return false;
}

/** 사설·루프백·링크로컬·ULA IPv6 인지. */
function isPrivateIpv6(ip: string): boolean {
	const addr = ip.toLowerCase().split('%')[0]; // zone id 제거
	if (addr === '::1' || addr === '::') return true; // 루프백·미지정
	const mapped = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/); // ::ffff:1.2.3.4 등
	if (mapped) return isPrivateIpv4(mapped[1]);
	if (/^fe[89ab]/.test(addr)) return true; // fe80::/10 링크로컬
	if (/^f[cd]/.test(addr)) return true; // fc00::/7 ULA
	return false;
}

/** 내부망(사설/루프백/링크로컬/예약) IP 인지 판정. IP 로 파싱 안 되면 안전측으로 true. */
export function isPrivateIp(ip: string): boolean {
	const kind = isIP(ip);
	if (kind === 4) return isPrivateIpv4(ip);
	if (kind === 6) return isPrivateIpv6(ip);
	return true;
}

/**
 * URL 호스트를 DNS 해석해 내부망으로 향하면 예외를 던진다.
 * 통과하면 안전(공개 대역)으로 간주. 프로토콜 검사는 호출부 책임.
 */
export async function assertPublicUrl(parsed: URL): Promise<void> {
	const host = parsed.hostname.replace(/^\[|\]$/g, ''); // IPv6 리터럴 대괄호 제거
	if (host === 'localhost' || host.endsWith('.localhost')) {
		throw new Error('내부 호스트 접근이 차단되었습니다.');
	}

	let addrs: { address: string }[];
	try {
		addrs = await lookup(host, { all: true });
	} catch {
		throw new Error('호스트를 확인할 수 없습니다.');
	}
	if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
		throw new Error('내부망 IP 로의 요청은 차단됩니다.');
	}
}
