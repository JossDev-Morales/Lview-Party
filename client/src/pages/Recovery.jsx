import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { recoveryRequest, recoveryValidation } from "../api/recovery";
import { Button, Card, Center, Field, PinInput, Stack } from "@chakra-ui/react";

export default function Recovery() {
  const [stage, setStage] = useState(0);
  const [searchParams] = useSearchParams();
  const mail = searchParams.get("mail");
  const [requestToken, setRequestToken] = useState("");
  const [OTP, setOTP] = useState(["", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    (async () => {
      let resToken = await recoveryRequest(mail);
      setRequestToken(resToken);
    })();
  }, []);
  return (
    <div className="page center-full">
      {stage === 0 ? (
        <Card.Root maxW="sm">
          <Card.Header>
            <Card.Title>Check your inbox!</Card.Title>
            <Card.Description>
              We've sent a verification code to your email. Please enter the
              5-digit code to continue resetting your password.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <Center w="full">
              <PinInput.Root value={OTP} onValueChange={(e) => setOTP(e.value)}>
                <PinInput.HiddenInput />
                <PinInput.Control>
                  <PinInput.Input index={0} />
                  <PinInput.Input index={1} />
                  <PinInput.Input index={2} />
                  <PinInput.Input index={3} />
                  <PinInput.Input index={4} />
                </PinInput.Control>
              </PinInput.Root>
            </Center>
          </Card.Body>
          <Card.Footer justifyContent="center">
            <Button
              loading={loading}
              w={"full"}
              className="btnPrimary"
              variant="solid"
              onClick={async () => {
                try {
                  setLoading(true);
                  let token = recoveryValidation(requestToken, OTP);
                  setResetToken(token);
                  setStage(1);
                  setLoading(false);
                } catch (error) {
                  setLoading(false);
                  console.log(error);
                  if(error.response.status===500){
                    alert('la validacion fallo')
                  }
                }
              }}
            >
              Continue
            </Button>
          </Card.Footer>
        </Card.Root>
      ) : (
        <></>
      )}
    </div>
  );
}
