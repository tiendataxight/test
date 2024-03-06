#ideally org and proj would be configurable, but a FB admin needs to do this
formbio workflow run \
--env prod \
--org bioinfoteam \ 
--project taysha \ 
--run-name aimlHello \
--repo formbio/nf-echo \
--version main \
-- \
--message 'hello_world'

formbio://form-bio-customer-support/onboarding-project/AAV/scAAV_CBA_eGFP.clean.fasta