import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { recoveryRequest, recoveryValidation, resetPassword } from "../api/recovery";
import {
  Alert,
  Button,
  Card,
  Center,
  CloseButton,
  Field,
  Image,
  Input,
  PinInput,
  Stack,
} from "@chakra-ui/react";
import success from '../assets/success-process.svg'
import mailSent from '../assets/mail-sent.svg'
export default function Recovery() {
  const [stage, setStage] = useState(0);
  const [stageError, setStageError] = useState(false);
  const [searchParams] = useSearchParams();
  const mailParam = searchParams.get("mail");
  const [mail, setMail] = useState("");
  const [requestToken, setRequestToken] = useState("");
  const [OTP, setOTP] = useState(["", "", "", "", ""]);
  const [password1,setPassword1] = useState("")
  const [password2,setPassword2] = useState("")
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState("");
  const [alertStatus,setAlertStatus] = useState("error")
  useEffect(() => {
    (async () => {
      try {
        if (mailParam) {
          setMail(mailParam);
          await request(mailParam); // hace la petición directamente
          setStage(1);
        }
      } catch (error) {
        console.log(error);
      }
    })();
  }, [mailParam]);

  const request = async (targetMail) => {
    try {
      let resToken = await recoveryRequest(targetMail);
      setRequestToken(resToken);
    } catch (error) {
      if (error.code == "ERR_NETWORK") {
        setAlert("Network error");
      } else if (error.status === 400) {
        alert(error.response?.data?.message);
      }
      throw error;
    }
  };
  useEffect(() => {
    let timeout = setTimeout(() => {
      if (stageError) {
        setStageError(false);
      }
    }, 600);
    return () => {
      clearTimeout(timeout);
    };
  }, [stageError]);
  useEffect(() => {
    let timeout = setTimeout(() => {
      if (alert) {
        setAlert("");
      }
    }, 3000);
    return () => {
      clearTimeout(timeout);
    };
  }, [alert]);
  return (
    <div className="page center-full relative">
      <div className="alertStack">
        {alert !== "" && (
          <Alert.Root status={alertStatus} variant="surface">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Something went wrong!</Alert.Title>
              <Alert.Description>{alert}</Alert.Description>
            </Alert.Content>
            <CloseButton
              pos="relative"
              top="-2"
              insetEnd="-2"
              onClick={() => {
                setAlert("");
              }}
            />
          </Alert.Root>
        )}
      </div>
      {stage === 0 && !mailParam && (
        <Card.Root w={"sm"}>
          <Card.Header>
            <Card.Title>Password Recovery</Card.Title>
            <Card.Description>
              Enter your email address to begin.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <Field.Root>
              <Input
                placeholder="your@email.com"
                focusRingColor={"#6e7cfd"}
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                className={stageError && "shakeError"}
              />
            </Field.Root>
          </Card.Body>
          <Card.Footer>
            <Button
              loading={loading}
              className="btnPrimary"
              w="full"
              onClick={async () => {
                try {
                  if (mail) {
                    setLoading(true);
                    await request(mail);
                    setStage(1);
                    setLoading(false);
                  } else {
                    setStageError(true);
                  }
                } catch (error) {
                  setLoading(false);
                  console.log(error);
                  if (error.code == "ERR_NETWORK") {
                    setAlert("Network error");
                  } else if (error.status === 400) {
                    setAlert(error.response?.data?.message);
                  }
                } finally {
                  setLoading(false);
                }
              }}
            >
              Continue
            </Button>
          </Card.Footer>
        </Card.Root>
      )}

      {stage === 1 && (
        <Card.Root w={"sm"} overflow="hidden">
          <Center padding={"20px"}>
            <Image src={mailSent} alt="Mail sent" maxW={"200px"}></Image>
          </Center>
          <Card.Header>
            <Card.Title>Check your inbox!</Card.Title>
            <Card.Description>
              We've sent a verification code to your email. Please enter the
              5-digit code.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <Center w="full">
              <PinInput.Root value={OTP} onValueChange={(e) => setOTP(e.value)}>
                <PinInput.HiddenInput />
                <PinInput.Control className={stageError && "shakeError"}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <PinInput.Input key={i} index={i} focusRingColor={"#6e7cfd"} />
                  ))}
                </PinInput.Control>
              </PinInput.Root>
            </Center>
          </Card.Body>
          <Card.Footer justifyContent="center">
            <Button
              loading={loading}
              w="full"
              className="btnPrimary"
              variant="solid"
              focusRingColor={"#6e7cfd"}
              onClick={async () => {
                try {
                  console.log("start");
                  if (OTP.some((d) => d == "")) {
                    console.log("error");
                    setStageError(true);
                    return;
                  }
                  setLoading(true);
                  let token = await recoveryValidation(requestToken, OTP.join(''));
                  setResetToken(token);
                  setStage(2); // avanzar al formulario de cambio
                } catch (error) {
                  console.error(error);
                  if (error.code == "ERR_NETWORK") {
                    setAlert("Network error");
                  } else if (error.status === 400) {
                    setAlert(error.response?.data?.message);
                  }
                } finally {
                  setLoading(false);
                }
              }}
            >
              Continue
            </Button>
          </Card.Footer>
        </Card.Root>
      )}

      {stage === 2 && (
        <Card.Root w={"sm"}>
          <Card.Header>
            <Card.Title>Reset your password</Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack>
              <Field.Root>
                <Field.Label>Password</Field.Label>
                <Input focusRingColor={"#6e7cfd"} value={password1} onChange={(e)=>{setPassword1(e.target.value)}} placeholder="New password" type="password" className={stageError && "shakeError"}/>
              </Field.Root>
              <Field.Root>
                <Field.Label>Confirm your password</Field.Label>
                <Input focusRingColor={"#6e7cfd"} value={password2} onChange={(e)=>{setPassword2(e.target.value)}} placeholder="Confirm password" type="password" className={stageError && "shakeError"}/>
              </Field.Root>
            </Stack>
          </Card.Body>
          <Card.Footer>
            <Button className="btnPrimary" w="full" onClick={async () => {
                try {
                    console.log(password1,password2)
                    if(!password1||!password2){
                        setAlertStatus('info')
                        setAlert("Make sure you've entered and confirmed your new password!")
                        setStageError(true)
                        return;
                    }
                    if(password1!==password2){
                        setAlertStatus('info')
                        setAlert("Password do not match. Please try again!")
                        setStageError(true)
                        return;
                    }
                    setLoading(true)
                    await resetPassword(token,password1)
                    setLoading(false)
                    setStage(3)
                } catch (error) {
                  console.error(error);
                  if (error.code == "ERR_NETWORK") {
                    setAlert("Network error");
                  } else if (error.status === 400) {
                    setAlert(error.response?.data?.message);
                  }
                } finally {
                  setLoading(false);
                }
            }}>
              Submit
            </Button>
          </Card.Footer>
        </Card.Root>
      )}

      {stage === 3 && (
        <Card.Root w={"sm"} overflow="hidden">
          <Image src={success} alt="Success"></Image>
          <Card.Body>
            <Card.Title>Password updated!</Card.Title>
            <Card.Description>
              You may now sign in with your new password.
            </Card.Description>
          </Card.Body>
        </Card.Root>
      )}
    </div>
  );
}
