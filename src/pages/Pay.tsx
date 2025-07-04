import barcondeimg from '../assets/barcode.png';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { useCartStore } from '../store/cart';
import { usePaymentStore } from '../store/payment';
import { postUserPaymentQr, getUserMe } from '../utils/api';

const PayContainer = styled.div`
  padding: 1.5rem;
  padding-bottom: 15rem;
  margin: 0 auto;
  background-color: #008C0E;
  height: 100vh; 
`

const Title = styled.p`
  text-align: center;
  font-size: 50px;
  color: white;
  -webkit-text-stroke: 0.8px white;
  margin-top: 80px;
`
const ImgWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`

const Barcode = styled.img`
  padding-top: 5rem;
  padding-bottom: 2rem;
  max-width: 25rem;
  display: block;
`

const HiddenVideo = styled.video`
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: 1px;
  height: 1px;
  visibility: hidden;
`;

const SubTitle = styled.div`
  margin-top: 3rem;
  text-align: center;
  font-size: 2rem;
  color: white;
  -webkit-text-stroke: 0.8px white;
`
const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`
const Button = styled.div`
  margin: 40px auto 0 auto; 
  margin-top: 40px;
  width: 250px;
  height: 60px;
  border-radius: 12px;
  border: 2px solid white;
  background-color: white;
  color: black;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
`


export default function Pay() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const cart = useCartStore();
  const { setPaymentDetails } = usePaymentStore();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/beep.mp3');
    }
  }, []);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    const qrScanner = new QrScanner(
      videoRef.current,
      async (result) => {
        qrScanner.stop();
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.error("Error playing beep:", e));
        }
        try {
          const qrData = JSON.parse(result.data);
          const { customerKey, billingKey, accessToken } = qrData;

          if (!customerKey || !billingKey || !accessToken) {
            setScanError('Invalid QR code data.');
            console.error('Invalid QR code data:', qrData);
            return;
          }

          const totalPrice = cart.getTotalPrice();
          const items = cart.items;
          let orderName = '상품 구매';
          if (items.length > 0) {
            orderName = items.length > 1 ? `${items[0].name} 외 ${items.length - 1}건` : items[0].name;
          }
          
          const paymentInitResponse = await postUserPaymentQr({
            amount: totalPrice,
            orderName: orderName,
          });

          const user = await getUserMe(accessToken);

          setPaymentDetails({
            orderId: paymentInitResponse.orderId,
            amount: totalPrice,
            orderName: orderName,
            customerKey,
            billingKey,
            accessToken,
            paymentType: 'qr',
            user: user,
          });

          navigate('/pin');
        } catch (error) {
          console.error('Error processing QR code:', error);
          setScanError('Failed to process QR code. Please try again.');
        }
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment',
      }
    );

    qrScannerRef.current = qrScanner;

    qrScanner.start().catch(err => {
      console.error('Error starting QR scanner:', err);
      setScanError('Could not start QR scanner. Please check camera permissions.');
    });

    return () => {
      qrScanner.stop();
      qrScanner.destroy();
      qrScannerRef.current = null;
    };
  }, [navigate, cart, setPaymentDetails]);

  const goBack = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    navigate('/payment');
  };

  return (
    <>
      <PayContainer>
        <HiddenVideo ref={videoRef}></HiddenVideo>
        <Title>QR 코드 스캔중</Title>
        <ImgWrapper>
          <Barcode src={barcondeimg} alt="로고" />
        </ImgWrapper>
        <SubTitle>웹캠 카메라 부분에<br></br>QR 코드를 스캔해주세요!</SubTitle>
        {scanError && <SubTitle style={{ color: 'red', fontSize: '1.5rem' }}>{scanError}</SubTitle>}
        <Wrapper>
          <Button onClick={goBack}>취소</Button>
        </Wrapper>
      </PayContainer>
    </>
  )
}